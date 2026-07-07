<?php

namespace Tests\Unit;

use App\Models\User;
use App\Support\Access\DataScopeResolver;
use Mockery;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class UserAuthPayloadTest extends TestCase
{
    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_with_auth_payload_serializes_role_permission_names(): void
    {
        $user = $this->makeAdminUserMock(collect([
            new Permission(['name' => 'route.dashboard', 'guard_name' => 'web']),
            new Permission(['name' => 'route.employees', 'guard_name' => 'web']),
        ]));

        $payload = $user->withAuthPayload()->toArray();

        $this->assertIsArray($payload['permissions']);
        $this->assertNotEmpty($payload['permissions']);
        $this->assertContains('route.dashboard', $payload['permissions']);
        $this->assertContains('route.employees', $payload['permissions']);

        foreach ($payload['permissions'] as $permission) {
            $this->assertIsString($permission);
        }
    }

    public function test_with_auth_payload_does_not_serialize_empty_spatie_relation(): void
    {
        $user = $this->makeAdminUserMock(collect([
            new Permission(['name' => 'route.dashboard', 'guard_name' => 'web']),
        ]));

        $user->setRelation('permissions', collect());
        $this->assertTrue($user->relationLoaded('permissions'));

        $payload = $user->withAuthPayload()->toArray();

        $this->assertNotSame([], $payload['permissions']);
        $this->assertContains('route.dashboard', $payload['permissions']);
    }

    private function makeAdminUserMock($allPermissions)
    {
        $user = Mockery::mock(User::class)->makePartial();
        $user->shouldReceive('loadMissing')->with('roles')->andReturnSelf();
        $user->shouldReceive('hasRole')->with('Super Admin')->andReturn(false);
        $user->shouldReceive('getAllPermissions')->andReturn($allPermissions);
        $user->roles = collect([(object) ['name' => 'Admin']]);

        $scopeResolver = Mockery::mock(DataScopeResolver::class);
        $scopeResolver->shouldReceive('resolveAllForUser')->andReturn([
            'dashboard' => 'hierarchy',
            'users' => 'hierarchy',
            'departments' => 'hierarchy',
        ]);
        $this->app->instance(DataScopeResolver::class, $scopeResolver);

        return $user;
    }
}
