<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\Users\UserAdminService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class KeycloakAuthIntegrationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->configureKeycloak();
    }

    public function test_pending_endpoint_returns_empty_without_session(): void
    {
        $response = $this->statefulApi()->getJson('/api/auth/keycloak/pending');

        $response->assertNotFound()
            ->assertJsonPath('status', 'empty');
    }

    public function test_pending_endpoint_returns_profile_from_session(): void
    {
        $profile = [
            'sub' => '76226824-5424-4def-bbca-2839bb06e532',
            'preferred_username' => 'aaa',
            'email' => 'wahid@example.com',
            'name' => 'Wahid Rezgui',
            'user_id' => 42,
            'login_email' => 'aaa',
        ];

        $response = $this->statefulApi()->withSession([
            'keycloak_pending_activation' => $profile,
        ])->getJson('/api/auth/keycloak/pending');

        $response->assertOk()
            ->assertJsonPath('status', 'pending')
            ->assertJsonPath('profile.sub', $profile['sub'])
            ->assertJsonPath('profile.user_id', 42);
    }

    public function test_dismiss_pending_clears_session_keys(): void
    {
        $response = $this->statefulApi()->withSession([
            'keycloak_pending_activation' => ['sub' => 'pending-sub'],
            'keycloak_pending_id_token' => 'id-token',
        ])->postJson('/api/auth/keycloak/pending/dismiss');

        $response->assertOk()
            ->assertJsonPath('status', 'success');

        $this->assertNull(session('keycloak_pending_activation'));
        $this->assertNull(session('keycloak_pending_id_token'));
    }

    public function test_redirect_clears_pending_session_and_stores_oauth_state(): void
    {
        $response = $this->withSession([
            'keycloak_pending_activation' => ['sub' => 'old-sub'],
            'keycloak_pending_id_token' => 'old-token',
        ])->get('/api/auth/keycloak/redirect');

        $response->assertRedirect();
        $this->assertNull(session('keycloak_pending_activation'));
        $this->assertNull(session('keycloak_pending_id_token'));
        $this->assertNotEmpty(session('keycloak_oauth_state'));
    }

    public function test_callback_rejects_invalid_oauth_state(): void
    {
        $response = $this->withSession([
            'keycloak_oauth_state' => 'expected-state',
        ])->get('/api/auth/keycloak/callback?code=abc&state=wrong-state');

        $response->assertRedirect();
        $this->assertStringContainsString(
            'sso_error=',
            (string) $response->headers->get('Location')
        );
        $this->assertStringContainsString(
            urlencode('Invalid sign-in state. Please try again.'),
            (string) $response->headers->get('Location')
        );
    }

    public function test_callback_rejects_missing_authorization_code(): void
    {
        $response = $this->withSession([
            'keycloak_oauth_state' => 'valid-state',
        ])->get('/api/auth/keycloak/callback?state=valid-state');

        $response->assertRedirect();
        $this->assertStringContainsString(
            urlencode('Keycloak did not return an authorization code.'),
            (string) $response->headers->get('Location')
        );
    }

    public function test_callback_redirects_to_login_when_keycloak_returns_error(): void
    {
        $response = $this->get('/api/auth/keycloak/callback?error=access_denied&error_description=User+cancelled');

        $response->assertRedirect();
        $this->assertStringContainsString('sso_error=', (string) $response->headers->get('Location'));
        $this->assertStringContainsString('User+cancelled', (string) $response->headers->get('Location'));
    }

    public function test_callback_redirects_to_pending_for_unlinked_keycloak_user(): void
    {
        if (! $this->usersTableSupportsKeycloakProvisioning()) {
            $this->markTestSkipped('Users table is missing Keycloak provisioning columns.');
        }

        Http::fake([
            'https://keycloak.example.com/realms/gate/protocol/openid-connect/token' => Http::response([
                'access_token' => 'access-token',
                'id_token' => $this->fakeJwt([
                    'sub' => '76226824-5424-4def-bbca-2839bb06e532',
                    'preferred_username' => 'sso-user-'.uniqid(),
                    'email' => 'sso-user@example.com',
                    'given_name' => 'SSO',
                    'family_name' => 'User',
                ]),
            ], 200),
            'https://keycloak.example.com/realms/gate/protocol/openid-connect/userinfo' => Http::response([
                'sub' => '76226824-5424-4def-bbca-2839bb06e532',
                'preferred_username' => 'sso-user',
                'email' => 'sso-user@example.com',
            ], 200),
        ]);

        $response = $this->withSession([
            'keycloak_oauth_state' => 'valid-state',
        ])->get('/api/auth/keycloak/callback?code=auth-code&state=valid-state');

        $response->assertRedirect('/auth/pending');

        $pending = session('keycloak_pending_activation');
        $this->assertIsArray($pending);
        $this->assertSame('76226824-5424-4def-bbca-2839bb06e532', $pending['sub'] ?? null);
        $this->assertNotEmpty($pending['user_id'] ?? null);
    }

    public function test_activate_sso_requires_role_and_department(): void
    {
        if (! $this->usersTableSupportsKeycloakProvisioning()) {
            $this->markTestSkipped('Users table is missing Keycloak provisioning columns.');
        }

        $user = $this->createPendingSsoUser();
        if ($user === null) {
            $this->markTestSkipped('Unable to create pending SSO user in test database.');
        }

        $service = app(UserAdminService::class);

        try {
            $service->editUser(Request::create('/api/users/update', 'POST', [
                'id' => $user->id,
                'firstname' => 'Pending',
                'lastname' => 'User',
                'email' => $user->email,
                'activate_sso' => true,
            ]));
            $this->fail('Expected validation exception was not thrown.');
        } catch (\Illuminate\Validation\ValidationException $exception) {
            $this->assertArrayHasKey('role', $exception->errors());
            $this->assertArrayHasKey('dep_id', $exception->errors());
        } finally {
            $user->delete();
        }
    }

    public function test_activate_sso_rejects_duplicate_keycloak_sub(): void
    {
        if (! $this->usersTableSupportsKeycloakProvisioning()) {
            $this->markTestSkipped('Users table is missing Keycloak provisioning columns.');
        }

        $duplicateSub = '22222222-2222-2222-2222-222222222222';

        $linkedUser = $this->createUserRecord([
            'firstname' => 'Linked',
            'lastname' => 'User',
            'email' => 'linked-'.uniqid().'@example.com',
            'keycloak_sub' => $duplicateSub,
        ]);

        $pendingUser = $this->createPendingSsoUser($duplicateSub);

        if ($linkedUser === null || $pendingUser === null) {
            $linkedUser?->delete();
            $pendingUser?->delete();
            $this->markTestSkipped('Unable to create SSO users in test database.');
        }

        try {
            $response = app(UserAdminService::class)->editUser(Request::create('/api/users/update', 'POST', [
                'id' => $pendingUser->id,
                'firstname' => 'Pending',
                'lastname' => 'User',
                'email' => $pendingUser->email,
                'activate_sso' => true,
                'role' => 'Reporting',
                'dep_id' => 1,
            ]));

            $this->assertSame(422, $response->getStatusCode());
            $this->assertStringContainsString('مرتبط', (string) $response->getData(true)['message']);
        } finally {
            $pendingUser->delete();
            $linkedUser->delete();
        }
    }

    private function configureKeycloak(): void
    {
        config([
            'keycloak.enabled' => true,
            'keycloak.base_url' => 'https://keycloak.example.com',
            'keycloak.realm' => 'gate',
            'keycloak.client_id' => 'gate-bff',
            'keycloak.client_secret' => 'secret',
            'keycloak.verify_id_token' => false,
            'app.url' => 'http://gate.local',
        ]);
    }

    private function statefulApi(): static
    {
        return $this
            ->withHeader('Origin', 'http://gate.local')
            ->withHeader('Referer', 'http://gate.local/');
    }

    private function usersTableSupportsKeycloakProvisioning(): bool
    {
        return Schema::hasTable('users')
            && Schema::hasColumn('users', 'keycloak_pending_sub')
            && Schema::hasColumn('users', 'keycloak_sub');
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function createUserRecord(array $overrides): ?User
    {
        try {
            return User::query()->create(array_merge([
                'firstname' => 'Test',
                'lastname' => 'User',
                'email' => 'user-'.uniqid().'@example.com',
            ], $overrides));
        } catch (\Throwable) {
            return null;
        }
    }

    private function createPendingSsoUser(?string $sub = null): ?User
    {
        return $this->createUserRecord([
            'firstname' => 'Pending',
            'lastname' => 'User',
            'email' => 'pending-sso-'.uniqid().'@example.com',
            'keycloak_pending_sub' => $sub ?? '11111111-1111-1111-1111-111111111111',
        ]);
    }

    /**
     * @param  array<string, mixed>  $claims
     */
    private function fakeJwt(array $claims): string
    {
        $encode = static function (array $data): string {
            return rtrim(strtr(base64_encode((string) json_encode($data)), '+/', '-_'), '=');
        };

        return $encode(['alg' => 'RS256', 'kid' => 'test'])
            .'.'
            .$encode($claims)
            .'.'
            .$encode(['sig' => 'test']);
    }
}
