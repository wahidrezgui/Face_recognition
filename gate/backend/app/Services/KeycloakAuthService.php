<?php

namespace App\Services;

use App\Exceptions\KeycloakAccountNotLinkedException;
use App\Models\User;
use App\Services\Keycloak\KeycloakIdTokenVerifier;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

class KeycloakAuthService
{
    public function isEnabled(): bool
    {
        if (! config('keycloak.enabled')) {
            return false;
        }

        return $this->baseUrl() !== ''
            && config('keycloak.realm') !== ''
            && config('keycloak.client_id') !== '';
    }

    public function redirectUri(): string
    {
        $configured = config('keycloak.redirect_uri');

        if (is_string($configured) && $configured !== '') {
            return $configured;
        }

        return rtrim((string) config('app.url'), '/').'/api/auth/keycloak/callback';
    }

    public function createAuthorizationUrl(string $state): string
    {
        $query = [
            'client_id' => config('keycloak.client_id'),
            'redirect_uri' => $this->redirectUri(),
            'response_type' => 'code',
            'scope' => implode(' ', config('keycloak.scopes', ['openid', 'profile', 'email'])),
            'state' => $state,
        ];

        $prompt = config('keycloak.prompt');
        if (is_string($prompt) && $prompt !== '') {
            $query['prompt'] = $prompt;
        }

        return $this->authorizeEndpoint().'?'.http_build_query($query);
    }

    /**
     * @return array{user: User, claims: array<string, mixed>, id_token: ?string}
     */
    public function resolveUserFromAuthorizationCode(string $code): array
    {
        $tokenPayload = $this->exchangeAuthorizationCode($code);
        $claims = $this->resolveClaims($tokenPayload);
        $user = $this->findLocalUser($claims);

        if (! $user) {
            $pendingUser = $this->provisionPendingUser($claims);

            Log::info('Keycloak sign-in pending local account activation', [
                'identity' => $this->describeIdentity($claims),
                'user_id' => $pendingUser->id,
            ]);

            throw new KeycloakAccountNotLinkedException(
                $claims,
                isset($tokenPayload['id_token']) && is_string($tokenPayload['id_token'])
                    ? $tokenPayload['id_token']
                    : null,
                $pendingUser,
            );
        }

        return [
            'user' => $user->fresh()->load('roles'),
            'claims' => $claims,
            'id_token' => isset($tokenPayload['id_token']) && is_string($tokenPayload['id_token'])
                ? $tokenPayload['id_token']
                : null,
        ];
    }

    /**
     * @param  array<string, mixed>  $claims
     */
    public function findLocalUser(array $claims): ?User
    {
        $sub = $claims['sub'] ?? null;
        if (! is_string($sub) || $sub === '') {
            return null;
        }

        return User::query()->where('keycloak_sub', $sub)->first();
    }

    /**
     * Create or refresh a local user stub from Keycloak claims.
     * Stores sub in keycloak_pending_sub for admin activation (never exposed in UI).
     * Leaves keycloak_sub, password, dep_id, and default_base for admin setup.
     *
     * @param  array<string, mixed>  $claims
     */
    public function provisionPendingUser(array $claims): User
    {
        $attributes = $this->buildPendingUserAttributes($claims);
        $loginEmail = $attributes['email'];
        $pendingSub = $claims['sub'] ?? null;

        if (! is_string($pendingSub) || $pendingSub === '') {
            throw new RuntimeException('Keycloak did not return a subject identifier.');
        }

        $existing = User::query()
            ->whereRaw('LOWER(email) = ?', [mb_strtolower($loginEmail)])
            ->first();

        if ($existing) {
            if (filled($existing->keycloak_sub)) {
                throw new RuntimeException('This login is already linked to another Keycloak account.');
            }

            $existing->forceFill([
                'firstname' => $attributes['firstname'],
                'lastname' => $attributes['lastname'],
                'cnx' => 0,
                'keycloak_pending_sub' => $pendingSub,
            ])->save();

            return $existing->fresh();
        }

        return User::query()->create([
            'firstname' => $attributes['firstname'],
            'lastname' => $attributes['lastname'],
            'email' => $loginEmail,
            'cnx' => 0,
            'keycloak_pending_sub' => $pendingSub,
        ]);
    }

    /**
     * @param  array<string, mixed>  $claims
     * @return array{firstname: string, lastname: string, email: string}
     */
    public function buildPendingUserAttributes(array $claims): array
    {
        [$firstname, $lastname] = $this->splitNameFromClaims($claims);
        $loginEmail = $this->resolveLoginEmail($claims);

        if ($loginEmail === null) {
            throw new RuntimeException('Keycloak did not return a username or email for account provisioning.');
        }

        return [
            'firstname' => $firstname,
            'lastname' => $lastname,
            'email' => $loginEmail,
        ];
    }

    /**
     * @param  array<string, mixed>  $claims
     * @return array{0: string, 1: string}
     */
    public function splitNameFromClaims(array $claims): array
    {
        if (! empty($claims['given_name']) && is_string($claims['given_name'])) {
            $lastname = (! empty($claims['family_name']) && is_string($claims['family_name']))
                ? $claims['family_name']
                : '';

            return [trim($claims['given_name']), trim($lastname)];
        }

        if (! empty($claims['name']) && is_string($claims['name'])) {
            $parts = preg_split('/\s+/', trim($claims['name']), 2) ?: [];
            $firstname = $parts[0] ?? 'Keycloak';
            $lastname = $parts[1] ?? '';

            return [$firstname, $lastname];
        }

        $loginEmail = $this->resolveLoginEmail($claims);

        return [$loginEmail ?? 'Keycloak', 'User'];
    }

    /**
     * @param  array<string, mixed>  $claims
     */
    public function resolveLoginEmail(array $claims): ?string
    {
        foreach (['preferred_username', 'username'] as $key) {
            if (! empty($claims[$key]) && is_string($claims[$key])) {
                return trim($claims[$key]);
            }
        }

        if (! empty($claims['email']) && is_string($claims['email'])) {
            $email = trim($claims['email']);
            if (str_contains($email, '@')) {
                $localPart = strstr($email, '@', true);

                return is_string($localPart) && $localPart !== '' ? $localPart : $email;
            }

            return $email;
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $claims
     */
    public function describeIdentity(array $claims): string
    {
        $parts = [];
        foreach (['preferred_username', 'username', 'email', 'sub'] as $key) {
            if (! empty($claims[$key]) && is_string($claims[$key])) {
                $parts[] = $key.': '.$claims[$key];
            }
        }

        return $parts === [] ? 'no identity claims returned' : implode(', ', $parts);
    }

    public function createLogoutUrl(?string $idToken = null): ?string
    {
        if (! $this->isEnabled() || ! config('keycloak.federated_logout', true)) {
            return null;
        }

        $query = [
            'client_id' => config('keycloak.client_id'),
            'post_logout_redirect_uri' => $this->postLogoutRedirectUri(),
        ];

        if (is_string($idToken) && $idToken !== '') {
            $query['id_token_hint'] = $idToken;
        }

        return $this->logoutEndpoint().'?'.http_build_query($query);
    }

    public function postLogoutRedirectUri(): string
    {
        $configured = config('keycloak.post_logout_redirect_uri');

        if (is_string($configured) && $configured !== '') {
            return $configured;
        }

        return rtrim((string) config('app.url'), '/').'/';
    }

    /**
     * @return array<string, mixed>
     */
    private function exchangeAuthorizationCode(string $code): array
    {
        try {
            $response = Http::asForm()
                ->acceptJson()
                ->post($this->tokenEndpoint(), [
                    'grant_type' => 'authorization_code',
                    'client_id' => config('keycloak.client_id'),
                    'client_secret' => config('keycloak.client_secret'),
                    'redirect_uri' => $this->redirectUri(),
                    'code' => $code,
                ])
                ->throw();
        } catch (RequestException $exception) {
            throw new RuntimeException('Keycloak token exchange failed.', 0, $exception);
        }

        $payload = $response->json();

        if (! is_array($payload)) {
            throw new RuntimeException('Keycloak token response was invalid.');
        }

        return $payload;
    }

    /**
     * @param  array<string, mixed>  $tokenPayload
     * @return array<string, mixed>
     */
    private function resolveClaims(array $tokenPayload): array
    {
        $claims = [];

        if (isset($tokenPayload['id_token']) && is_string($tokenPayload['id_token'])) {
            $claims = array_merge($claims, $this->resolveIdTokenClaims($tokenPayload['id_token']));
        }

        if (isset($tokenPayload['access_token']) && is_string($tokenPayload['access_token'])) {
            $claims = array_merge($claims, $this->fetchUserInfo($tokenPayload['access_token']));
        }

        if ($claims !== []) {
            return $claims;
        }

        throw new RuntimeException('Keycloak did not return usable identity claims.');
    }

    /**
     * @return array<string, mixed>
     */
    private function resolveIdTokenClaims(string $idToken): array
    {
        $verifier = app(KeycloakIdTokenVerifier::class);

        if ($verifier->isEnabled()) {
            return $verifier->verify(
                $idToken,
                $this->jwksEndpoint(),
                $this->issuer(),
                (string) config('keycloak.client_id'),
            );
        }

        return $this->decodeJwtPayload($idToken);
    }

    private function issuer(): string
    {
        return $this->realmBase();
    }

    private function jwksEndpoint(): string
    {
        return $this->realmBase().'/protocol/openid-connect/certs';
    }

    /**
     * @return array<string, mixed>
     */
    private function fetchUserInfo(string $accessToken): array
    {
        try {
            $response = Http::withToken($accessToken)
                ->acceptJson()
                ->get($this->userInfoEndpoint())
                ->throw();
        } catch (RequestException) {
            return [];
        }

        $payload = $response->json();

        return is_array($payload) ? $payload : [];
    }

    /**
     * @return array<string, mixed>
     */
    private function decodeJwtPayload(string $jwt): array
    {
        $parts = explode('.', $jwt);
        if (count($parts) < 2) {
            return [];
        }

        $payload = $this->base64UrlDecode($parts[1]);
        if ($payload === null) {
            return [];
        }

        $decoded = json_decode($payload, true);

        return is_array($decoded) ? $decoded : [];
    }

    private function base64UrlDecode(string $value): ?string
    {
        $remainder = strlen($value) % 4;
        if ($remainder > 0) {
            $value .= str_repeat('=', 4 - $remainder);
        }

        $decoded = base64_decode(strtr($value, '-_', '+/'), true);

        return $decoded === false ? null : $decoded;
    }

    private function baseUrl(): string
    {
        return rtrim((string) config('keycloak.base_url'), '/');
    }

    private function realmBase(): string
    {
        return $this->baseUrl().'/realms/'.config('keycloak.realm');
    }

    private function authorizeEndpoint(): string
    {
        return $this->realmBase().'/protocol/openid-connect/auth';
    }

    private function tokenEndpoint(): string
    {
        return $this->realmBase().'/protocol/openid-connect/token';
    }

    private function userInfoEndpoint(): string
    {
        return $this->realmBase().'/protocol/openid-connect/userinfo';
    }

    private function logoutEndpoint(): string
    {
        return $this->realmBase().'/protocol/openid-connect/logout';
    }

    public static function generateState(): string
    {
        return Str::random(40);
    }
}
