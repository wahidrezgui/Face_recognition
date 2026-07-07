<?php

namespace Tests\Unit;

use Tests\TestCase;

class PermissionMiddlewareConfigTest extends TestCase
{
    public function test_write_middleware_uses_spatie_permission_syntax(): void
    {
        $keys = [
            'write_employees',
            'write_departments',
            'write_companies',
            'write_users',
            'write_reports',
            'write_settings',
            'manage_role_permissions',
        ];

        foreach ($keys as $key) {
            $value = config("roles.{$key}");
            $this->assertStringStartsWith('permission:', $value, "Expected permission middleware for {$key}");
        }
    }

    public function test_read_middleware_allows_read_or_write(): void
    {
        $this->assertSame(
            'permission:employees.read|employees.write',
            config('roles.read_employees')
        );
    }

    public function test_manage_role_permissions_middleware_uses_route_permission(): void
    {
        $this->assertSame(
            'permission:route.role_permissions',
            config('roles.manage_role_permissions')
        );
    }
}
