<?php

namespace Tests\Feature;

use App\Services\Keycloak\KeycloakIdTokenVerifier;
use App\Services\KeycloakAuthService;
use Tests\TestCase;

class KeycloakAuthTest extends TestCase
{
    public function test_providers_endpoint_reports_keycloak_disabled_by_default(): void
    {
        config([
            'keycloak.enabled' => false,
            'keycloak.base_url' => '',
            'keycloak.realm' => '',
            'keycloak.client_id' => '',
        ]);

        $response = $this->getJson('/api/auth/providers');

        $response->assertOk()
            ->assertJsonPath('keycloak.enabled', false)
            ->assertJsonPath('keycloak.login_url', null)
            ->assertJsonPath('login.title', config('login.title'));
    }

    public function test_providers_endpoint_exposes_login_url_when_enabled(): void
    {
        config([
            'keycloak.enabled' => true,
            'keycloak.base_url' => 'https://keycloak.example.com',
            'keycloak.realm' => 'gate',
            'keycloak.client_id' => 'gate-bff',
            'keycloak.client_secret' => 'secret',
            'app.url' => 'http://gate.local',
        ]);

        $response = $this->getJson('/api/auth/providers');

        $response->assertOk()
            ->assertJsonPath('keycloak.enabled', true)
            ->assertJsonPath('keycloak.login_url', url('/api/auth/keycloak/redirect'));
    }

    public function test_redirect_route_returns_to_login_when_disabled(): void
    {
        config([
            'keycloak.enabled' => false,
        ]);

        $response = $this->get('/api/auth/keycloak/redirect');

        $response->assertRedirect();
        $this->assertStringStartsWith('http://gate.local', $response->headers->get('Location'));
        $this->assertStringContainsString('sso_error=', $response->headers->get('Location'));
    }

    public function test_keycloak_service_builds_authorization_url(): void
    {
        config([
            'keycloak.enabled' => true,
            'keycloak.base_url' => 'https://keycloak.example.com',
            'keycloak.realm' => 'gate',
            'keycloak.client_id' => 'gate-bff',
            'app.url' => 'http://gate.local',
        ]);

        $service = app(KeycloakAuthService::class);
        $url = $service->createAuthorizationUrl('test-state');

        $this->assertStringContainsString('https://keycloak.example.com/realms/gate/protocol/openid-connect/auth', $url);
        $this->assertStringContainsString('client_id=gate-bff', $url);
        $this->assertStringContainsString('state=test-state', $url);
        $this->assertStringContainsString(urlencode('http://gate.local/api/auth/keycloak/callback'), $url);
    }

    public function test_keycloak_service_builds_logout_url(): void
    {
        config([
            'keycloak.enabled' => true,
            'keycloak.base_url' => 'https://keycloak.example.com',
            'keycloak.realm' => 'gate',
            'keycloak.client_id' => 'gate-bff',
            'keycloak.federated_logout' => true,
            'app.url' => 'http://gate.local',
        ]);

        $service = app(KeycloakAuthService::class);
        $url = $service->createLogoutUrl('id-token-example');

        $this->assertNotNull($url);
        $this->assertStringContainsString('https://keycloak.example.com/realms/gate/protocol/openid-connect/logout', $url);
        $this->assertStringContainsString('id_token_hint=id-token-example', $url);
        $this->assertStringContainsString(urlencode('http://gate.local/'), $url);
    }

    public function test_pending_profile_from_unlinked_exception(): void
    {
        $exception = new \App\Exceptions\KeycloakAccountNotLinkedException([
            'sub' => '76226824-5424-4def-bbca-2839bb06e532',
            'preferred_username' => 'aaa',
            'email' => 'wahidrezgui@gmail.com',
            'given_name' => 'Wahid',
            'family_name' => 'Rezgui',
        ]);

        $this->assertSame([
            'sub' => '76226824-5424-4def-bbca-2839bb06e532',
            'preferred_username' => 'aaa',
            'email' => 'wahidrezgui@gmail.com',
            'name' => 'Wahid Rezgui',
            'user_id' => null,
            'login_email' => null,
            'created' => false,
        ], $exception->pendingProfile());
    }

    public function test_build_pending_user_attributes_from_keycloak_claims(): void
    {
        $service = app(KeycloakAuthService::class);

        $this->assertSame([
            'firstname' => 'Wahid',
            'lastname' => 'Rezgui',
            'email' => 'aaa',
        ], $service->buildPendingUserAttributes([
            'preferred_username' => 'aaa',
            'email' => 'wahidrezgui@gmail.com',
            'given_name' => 'Wahid',
            'family_name' => 'Rezgui',
        ]));
    }

    public function test_id_token_verification_is_enabled_by_default(): void
    {
        $this->assertTrue((bool) config('keycloak.verify_id_token'));
    }

    public function test_id_token_claim_validation_accepts_valid_claims(): void
    {
        $verifier = app(KeycloakIdTokenVerifier::class);
        $now = 1_700_000_000;

        $verifier->validateClaims([
            'iss' => 'https://keycloak.example.com/realms/gate',
            'aud' => 'gate-bff',
            'exp' => $now + 300,
            'sub' => 'user-subject',
        ], 'https://keycloak.example.com/realms/gate', 'gate-bff', $now);

        $this->assertTrue(true);
    }

    public function test_id_token_claim_validation_rejects_invalid_issuer(): void
    {
        $verifier = app(KeycloakIdTokenVerifier::class);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('issuer');

        $verifier->validateClaims([
            'iss' => 'https://evil.example.com/realms/gate',
            'aud' => 'gate-bff',
            'exp' => time() + 300,
            'sub' => 'user-subject',
        ], 'https://keycloak.example.com/realms/gate', 'gate-bff');
    }

    public function test_id_token_claim_validation_rejects_expired_token(): void
    {
        $verifier = app(KeycloakIdTokenVerifier::class);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('expired');

        $verifier->validateClaims([
            'iss' => 'https://keycloak.example.com/realms/gate',
            'aud' => 'gate-bff',
            'exp' => time() - 600,
            'sub' => 'user-subject',
        ], 'https://keycloak.example.com/realms/gate', 'gate-bff');
    }

    public function test_id_token_verification_rejects_malformed_token(): void
    {
        $verifier = app(KeycloakIdTokenVerifier::class);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('format');

        $verifier->verify(
            'not-a-jwt',
            'https://keycloak.example.com/realms/gate/protocol/openid-connect/certs',
            'https://keycloak.example.com/realms/gate',
            'gate-bff',
        );
    }
}
