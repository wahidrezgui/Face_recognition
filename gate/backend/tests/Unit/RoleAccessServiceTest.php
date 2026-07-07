<?php

namespace Tests\Unit;

use App\Services\Access\RoleAccessService;
use Tests\TestCase;

class RoleAccessServiceTest extends TestCase
{
    public function test_permissions_from_request_builds_route_and_resource_names(): void
    {
        $service = app(RoleAccessService::class);

        $permissions = $service->permissionsFromRequest(
            ['employees', 'dashboard'],
            [
                'departments' => 'read',
                'employees' => 'write',
                'companies' => 'none',
            ]
        );

        $this->assertContains('route.employees', $permissions);
        $this->assertContains('route.dashboard', $permissions);
        $this->assertContains('departments.read', $permissions);
        $this->assertNotContains('departments.write', $permissions);
        $this->assertContains('employees.read', $permissions);
        $this->assertContains('employees.write', $permissions);
        $this->assertNotContains('companies.read', $permissions);
    }

    public function test_permissions_from_request_includes_scope_permissions(): void
    {
        $service = app(RoleAccessService::class);

        $permissions = $service->permissionsFromRequest(
            ['users'],
            ['users' => 'read'],
            ['users' => 'hierarchy', 'departments' => 'self']
        );

        $this->assertContains('route.users', $permissions);
        $this->assertContains('users.read', $permissions);
        $this->assertContains('users.scope.hierarchy', $permissions);
        $this->assertContains('departments.scope.self', $permissions);
        $this->assertNotContains('users.scope.global', $permissions);
    }
}
