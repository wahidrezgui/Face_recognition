<?php

namespace Tests\Unit;

use App\Models\User;
use App\Support\Access\DataScopeResolver;
use App\Support\Tree\DepartmentTreeService;
use Mockery;
use Tests\TestCase;

class DataScopeResolverTest extends TestCase
{
    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_extract_scope_permissions_picks_highest_level(): void
    {
        $resolver = app(DataScopeResolver::class);

        $scopes = $resolver->extractScopePermissions([
            'users.scope.self',
            'users.scope.hierarchy',
            'departments.scope.global',
        ]);

        $this->assertSame('hierarchy', $scopes['users']);
        $this->assertSame('global', $scopes['departments']);
        $this->assertSame('none', $scopes['dashboard']);
    }

    public function test_scope_permissions_from_levels_builds_permission_names(): void
    {
        $resolver = app(DataScopeResolver::class);

        $names = $resolver->scopePermissionsFromLevels([
            'users' => 'hierarchy',
            'dashboard' => 'self',
        ]);

        $this->assertContains('users.scope.hierarchy', $names);
        $this->assertContains('dashboard.scope.self', $names);
        $this->assertCount(2, $names);
    }

    public function test_resolve_department_ids_for_self_scope(): void
    {
        $tree = Mockery::mock(DepartmentTreeService::class);
        $resolver = new DataScopeResolver($tree);

        $ids = $resolver->resolveDepartmentIdsForScope(42, 'self');

        $this->assertSame([42], $ids);
    }

    public function test_resolve_department_ids_for_hierarchy_scope(): void
    {
        $tree = Mockery::mock(DepartmentTreeService::class);
        $tree->shouldReceive('getDepartmentAndAllChildrenDepartmentIds')
            ->once()
            ->with(42)
            ->andReturn([42, 43, 44]);

        $resolver = new DataScopeResolver($tree);

        $ids = $resolver->resolveDepartmentIdsForScope(42, 'hierarchy');

        $this->assertSame([42, 43, 44], $ids);
    }

    public function test_clamp_scope_respects_max_level(): void
    {
        $resolver = app(DataScopeResolver::class);

        $this->assertSame('self', $resolver->clampScope('hierarchy', 'self'));
        $this->assertSame('hierarchy', $resolver->clampScope('hierarchy', 'global'));
        $this->assertSame('global', $resolver->clampScope('global', 'self'));
        $this->assertSame('self', $resolver->clampScope('self', 'global'));
    }

    public function test_resolve_for_user_falls_back_to_role_defaults(): void
    {
        $user = Mockery::mock(User::class)->makePartial();
        $user->shouldReceive('hasRole')->with('Super Admin')->andReturn(false);
        $user->shouldReceive('loadMissing')->with('roles');
        $user->shouldReceive('getAllPermissions')->andReturn(collect([]));
        $user->roles = collect([(object) ['name' => 'Local Admin']]);

        $tree = Mockery::mock(DepartmentTreeService::class);
        $resolver = new DataScopeResolver($tree);

        $this->assertSame('self', $resolver->resolveForUser($user, 'dashboard'));
    }
}
