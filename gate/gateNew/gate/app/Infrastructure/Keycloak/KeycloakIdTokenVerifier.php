<?php

namespace App\Infrastructure\Keycloak;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class KeycloakIdTokenVerifier
{
    public function isEnabled(): bool
    {
        return (bool) config('keycloak.verify_id_token', true);
    }

    /**
     * @return array<string, mixed>
     */
    public function verify(string $idToken, string $jwksUrl, string $issuer, string $clientId): array
    {
        $parts = explode('.', $idToken);
        if (count($parts) !== 3) {
            throw new RuntimeException('Keycloak id_token format is invalid.');
        }

        [$encodedHeader, $encodedPayload, $encodedSignature] = $parts;

        $header = $this->decodeJson($this->base64UrlDecode($encodedHeader), 'Keycloak id_token header');
        $claims = $this->decodeJson($this->base64UrlDecode($encodedPayload), 'Keycloak id_token payload');
        $signature = $this->base64UrlDecode($encodedSignature);

        if ($signature === null) {
            throw new RuntimeException('Keycloak id_token signature is invalid.');
        }

        $algorithm = $header['alg'] ?? null;
        if ($algorithm !== 'RS256') {
            throw new RuntimeException('Unsupported Keycloak id_token algorithm.');
        }

        $kid = $header['kid'] ?? null;
        if (! is_string($kid) || $kid === '') {
            throw new RuntimeException('Keycloak id_token is missing a key id.');
        }

        $pem = $this->resolvePublicKeyPem($jwksUrl, $kid);
        $publicKey = openssl_pkey_get_public($pem);

        if ($publicKey === false) {
            throw new RuntimeException('Unable to load Keycloak signing key.');
        }

        $verified = openssl_verify(
            $encodedHeader.'.'.$encodedPayload,
            $signature,
            $publicKey,
            OPENSSL_ALGO_SHA256
        );

        if ($verified !== 1) {
            throw new RuntimeException('Keycloak id_token signature verification failed.');
        }

        $this->validateClaims($claims, $issuer, $clientId);

        return $claims;
    }

    /**
     * @param  array<string, mixed>  $claims
     */
    public function validateClaims(array $claims, string $issuer, string $clientId, ?int $now = null): void
    {
        $now ??= time();
        $leeway = (int) config('keycloak.id_token_leeway', 60);

        $tokenIssuer = $claims['iss'] ?? null;
        if (! is_string($tokenIssuer) || rtrim($tokenIssuer, '/') !== rtrim($issuer, '/')) {
            throw new RuntimeException('Keycloak id_token issuer is invalid.');
        }

        if (! $this->audienceMatches($claims['aud'] ?? null, $clientId)) {
            throw new RuntimeException('Keycloak id_token audience is invalid.');
        }

        $expiresAt = $claims['exp'] ?? null;
        if (! is_numeric($expiresAt) || (int) $expiresAt < ($now - $leeway)) {
            throw new RuntimeException('Keycloak id_token has expired.');
        }

        $notBefore = $claims['nbf'] ?? null;
        if (is_numeric($notBefore) && (int) $notBefore > ($now + $leeway)) {
            throw new RuntimeException('Keycloak id_token is not yet valid.');
        }

        $subject = $claims['sub'] ?? null;
        if (! is_string($subject) || $subject === '') {
            throw new RuntimeException('Keycloak id_token is missing subject.');
        }
    }

    private function audienceMatches(mixed $audience, string $clientId): bool
    {
        if (is_string($audience)) {
            return $audience === $clientId;
        }

        if (is_array($audience)) {
            return in_array($clientId, $audience, true);
        }

        return false;
    }

    private function resolvePublicKeyPem(string $jwksUrl, string $kid): string
    {
        $jwks = Cache::remember(
            'keycloak.jwks.'.md5($jwksUrl),
            (int) config('keycloak.jwks_cache_ttl', 3600),
            function () use ($jwksUrl) {
                $response = Http::acceptJson()->get($jwksUrl)->throw();
                $payload = $response->json();

                return is_array($payload) ? $payload : [];
            }
        );

        $keys = $jwks['keys'] ?? null;
        if (! is_array($keys)) {
            throw new RuntimeException('Keycloak JWKS response was invalid.');
        }

        foreach ($keys as $key) {
            if (! is_array($key)) {
                continue;
            }

            if (($key['kid'] ?? null) === $kid) {
                return $this->jwkToPem($key);
            }
        }

        throw new RuntimeException('Keycloak signing key was not found.');
    }

    /**
     * @param  array<string, mixed>  $jwk
     */
    private function jwkToPem(array $jwk): string
    {
        if (($jwk['kty'] ?? '') !== 'RSA') {
            throw new RuntimeException('Unsupported Keycloak JWK key type.');
        }

        $modulus = $this->base64UrlDecode((string) ($jwk['n'] ?? ''));
        $exponent = $this->base64UrlDecode((string) ($jwk['e'] ?? ''));

        if ($modulus === null || $exponent === null) {
            throw new RuntimeException('Keycloak JWK modulus or exponent is invalid.');
        }

        $modulus = ltrim($modulus, "\x00");
        $exponent = ltrim($exponent, "\x00");

        if ($modulus === '' || $exponent === '') {
            throw new RuntimeException('Keycloak JWK modulus or exponent is empty.');
        }

        $modulus = chr(0x02).$this->encodeDerLength(strlen($modulus)).$modulus;
        $exponent = chr(0x02).$this->encodeDerLength(strlen($exponent)).$exponent;
        $sequence = chr(0x30).$this->encodeDerLength(strlen($modulus.$exponent)).$modulus.$exponent;
        $bitString = chr(0x03).$this->encodeDerLength(strlen($sequence) + 1)."\x00".$sequence;

        $rsaOid = hex2bin('300d06092a864886f70d0101010500');
        $publicKeyInfo = chr(0x30).$this->encodeDerLength(strlen($rsaOid.$bitString)).$rsaOid.$bitString;
        $pem = "-----BEGIN PUBLIC KEY-----\n"
            .chunk_split(base64_encode($publicKeyInfo), 64, "\n")
            ."-----END PUBLIC KEY-----\n";

        return $pem;
    }

    private function encodeDerLength(int $length): string
    {
        if ($length < 0x80) {
            return chr($length);
        }

        $temp = ltrim(pack('N', $length), "\x00");
        if ($temp === '') {
            $temp = "\x00";
        }

        return chr(0x80 | strlen($temp)).$temp;
    }

    /**
     * @return array<string, mixed>
     */
    private function decodeJson(?string $json, string $label): array
    {
        if ($json === null) {
            throw new RuntimeException($label.' is invalid.');
        }

        $decoded = json_decode($json, true);

        if (! is_array($decoded)) {
            throw new RuntimeException($label.' is invalid.');
        }

        return $decoded;
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
}
