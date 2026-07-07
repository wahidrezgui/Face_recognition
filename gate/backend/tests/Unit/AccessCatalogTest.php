<?php

namespace Tests\Unit;

use App\Support\Access\AccessCatalog;
use Tests\TestCase;

class AccessCatalogTest extends TestCase
{
    public function test_all_permission_names_include_routes_and_resources(): void
    {
        $names = AccessCatalog::allPermissionNames();

        $this->assertContains('route.employees', $names);
        $this->assertContains('route.role_permissions', $names);
        $this->assertContains('route.dashboard', $names);
        $this->assertContains('departments.read', $names);
        $this->assertContains('departments.write', $names);
        $this->assertContains('employees.write', $names);
        $this->assertContains('users.scope.global', $names);
        $this->assertContains('dashboard.scope.hierarchy', $names);
    }

    public function test_admin_default_permissions_match_consolidated_routes(): void
    {
        $permissions = AccessCatalog::defaultPermissionsForRole('Admin');

        $this->assertContains('route.dashboard', $permissions);
        $this->assertNotContains('route.home', $permissions);
        $this->assertContains('route.employees', $permissions);
        $this->assertNotContains('route.bases', $permissions);
        $this->assertContains('employees.write', $permissions);
        $this->assertContains('departments.write', $permissions);
        $this->assertContains('dashboard.scope.hierarchy', $permissions);
        $this->assertContains('users.scope.hierarchy', $permissions);
    }

    public function test_admin_default_permissions_legacy_removed(): void
    {
        $permissions = AccessCatalog::defaultPermissionsForRole('Admin');

        $this->assertNotContains('route.home', $permissions);
        $this->assertNotContains('route.users', $permissions);
        $this->assertNotContains('route.departments', $permissions);
    }

    public function test_inspector_default_permissions_are_read_only(): void
    {
        $permissions = AccessCatalog::defaultPermissionsForRole('Inspector');

        $this->assertContains('route.employees', $permissions);
        $this->assertContains('employees.read', $permissions);
        $this->assertNotContains('employees.write', $permissions);
        $this->assertNotContains('route.bases', $permissions);
    }

    public function test_super_admin_gets_every_permission(): void
    {
        $permissions = AccessCatalog::defaultPermissionsForRole('Super Admin');

        $this->assertSame(AccessCatalog::allPermissionNames(), $permissions);
    }

    public function test_gate_guard_default_permissions_include_gate_routes(): void
    {
        $permissions = AccessCatalog::defaultPermissionsForRole('Gate Guard');

        $this->assertContains('route.gate', $permissions);
        $this->assertContains('route.gate_plate_search', $permissions);
        $this->assertNotContains('route.dashboard', $permissions);
    }

    public function test_role_requires_department_config(): void
    {
        $this->assertTrue(AccessCatalog::roleRequiresDepartment('Admin'));
        $this->assertFalse(AccessCatalog::roleRequiresDepartment('Gate Guard'));
    }

    public function test_assignable_roles_config_for_admin_excludes_super_admin(): void
    {
        $allowed = config('access.assignable_roles.Admin', []);

        $this->assertContains('Admin', $allowed);
        $this->assertNotContains('Super Admin', $allowed);
    }
}
