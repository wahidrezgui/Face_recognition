<?php

namespace App\Services\Stats;

use App\Models\User;
use App\Support\Tree\DepartmentTreeService;

class StatsScopeResolver
{
    public function __construct(private DepartmentTreeService $departmentTree)
    {
    }

    public function resolveScopeForUser(User $user): string
    {
        $roleName = $user->roles->first()?->name ?? '';
        $map = config('dashboard.scope_by_role', []);

        return $map[$roleName] ?? 'hierarchy';
    }

    public function clampScope(string $roleScope, ?string $requestedScope): string
    {
        if ($roleScope === 'global') {
            return 'global';
        }

        if ($roleScope === 'self') {
            return 'self';
        }

        if ($requestedScope === 'self') {
            return 'self';
        }

        return 'hierarchy';
    }

    public function resolveDepartmentIds(int $departmentId, string $scope): array
    {
        if ($scope === 'self') {
            return [$departmentId];
        }

        return $this->departmentTree->getDepartmentAndAllChildrenDepartmentIds($departmentId);
    }

    public function scopeLabel(string $scope): string
    {
        return match ($scope) {
            'global' => 'إحصائيات المؤسسة',
            'hierarchy' => 'إحصائيات الوحدة والوحدات الفرعية',
            'self' => 'إحصائيات الوحدة فقط',
            default => '',
        };
    }
}
