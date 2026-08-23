<?php

namespace Tests\Feature;

use Tests\TestCase;

class AuthLoginTest extends TestCase
{
    public function test_login_returns_401_with_invalid_credentials(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'username' => 'nonexistent-user',
            'password' => 'wrong-password',
        ]);

        $response->assertUnauthorized()
            ->assertJsonPath('status', 'error');
    }

    public function test_login_endpoint_accepts_json_post(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'username' => '',
            'password' => '',
        ]);

        $this->assertContains($response->status(), [401, 422]);
    }

    public function test_login_accepts_plain_username(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'username' => 'a116876',
            'password' => 'wrong-password',
        ]);

        $response->assertUnauthorized()
            ->assertJsonPath('status', 'error');
    }
}
