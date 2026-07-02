<?php

namespace Tests\Feature;

use Tests\TestCase;

class MovementCheckTest extends TestCase
{
    public function test_check_endpoint_requires_authentication(): void
    {
        $response = $this->postJson('/api/movements/check', [
            'qrcode' => 'nonexistent-qrcode-xyz',
            'base_id' => 1,
        ]);

        $response->assertUnauthorized();
    }

    public function test_ping_health_check_is_public(): void
    {
        $response = $this->getJson('/api/ping');

        $response->assertOk()
            ->assertJsonPath('status', 'ok');
    }
}
