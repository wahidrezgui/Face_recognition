<?php

namespace App\Domain\AccessControl;

use App\Application\Personnel\DepartmentTreeService;
use App\Domain\Identity\Models\User;
use Illuminate\Auth\Access\AuthorizationException;

/**
 * Resolves a user's data-scope level (global|hierarchy|self) per scopable
 * resource, and the department IDs that a non-global scope allows.
 */
class DataScopeResolver
{
    public const LEVELS = ['global', 'hierarchy', 'self'];

    public function __construct(private DepartmentTreeService $departmentTree) {}

    public function scopableResources(): array
    {
        return config('access.scopable_resources', []);
    }

    public function resolveForUser(User $user, string $resource): string
    {
        $user->loadMissing('roles');
        $permissionNames = $user->getAllPermissions()->pluck('name');

        foreach (self::LEVELS as $level) {
            if ($permissionNames->contains(AccessCatalog::resourceScopePermission($resource, $level))) {
                return $level;
            }
        }

        $roleName = $user->roles->first()?->name ?? '';
        $fallback = config("access.default_resource_scope.{$roleName}.{$resource}");

        return in_array($fallback, self::LEVELS, true) ? $fallback : 'hierarchy';
    }

    public function resolveAllForUser(User $user): array
    {
        $scopes = [];
        foreach ($this->scopableResources() as $resource) {
            $scopes[$resource] = $this->resolveForUser($user, $resource);
        }

        return $scopes;
    }

    public function clampScope(string $maxScope, ?string $requestedScope): string
    {
        if ($maxScope === 'global') {
            return 'global';
        }

        if ($maxScope === 'self') {
            return 'self';
        }

        if ($requestedScope === 'self') {
            return 'self';
        }

        return 'hierarchy';
    }

    public function userDepartmentId(User $user): int
    {
        return (int) ($user->dep_id ?? 0);
    }

    public function resolveDepartmentIds(User $user, string $resource): array
    {
        $scope = $this->resolveForUser($user, $resource);

        if ($scope === 'global') {
            return [];
        }

        $depId = $this->userDepartmentId($user);
        if ($depId <= 0) {
            return [];
        }

        return $this->resolveDepartmentIdsForScope($depId, $scope);
    }

    public function resolveDepartmentIdsForScope(int $departmentId, string $scope): array
    {
        if ($scope === 'global') {
            return [];
        }

        if ($scope === 'self') {
            return [$departmentId];
        }

        return $this->departmentTree->getDepartmentAndAllChildrenDepartmentIds($departmentId);
    }

    public function assertDepartmentInScope(User $user, string $resource, int $departmentId): void
    {
        $scope = $this->resolveForUser($user, $resource);

        if ($scope === 'global') {
            return;
        }

        $allowed = $this->resolveDepartmentIds($user, $resource);

        if ($departmentId <= 0 || ! in_array($departmentId, $allowed, true)) {
            throw new AuthorizationException('Department is outside your allowed scope.');
        }
    }

    public function assertRouteDepartmentId(User $user, string $resource, int $requestedDepId): int
    {
        $scope = $this->resolveForUser($user, $resource);
        $userDepId = $this->userDepartmentId($user);

        if ($scope === 'global') {
            return $requestedDepId > 0 ? $requestedDepId : $userDepId;
        }

        if ($userDepId <= 0) {
            throw new AuthorizationException('User department is not configured.');
        }

        if ($requestedDepId > 0 && $requestedDepId !== $userDepId) {
            $this->assertDepartmentInScope($user, $resource, $requestedDepId);
        }

        return $userDepId;
    }

    public function scopeLabel(string $scope): string
    {
        return match ($scope) {
            'global' => trans('access.scopeLabel.global'),
            'hierarchy' => trans('access.scopeLabel.hierarchy'),
            'self' => trans('access.scopeLabel.self'),
            default => '',
        };
    }

    public function extractScopePermissions(array $permissionNames): array
    {
        $selected = collect($permissionNames);
        $result = [];

        foreach ($this->scopableResources() as $resource) {
            $result[$resource] = 'none';
            foreach (self::LEVELS as $level) {
                if ($selected->contains(AccessCatalog::resourceScopePermission($resource, $level))) {
                    $result[$resource] = $level;
                    break;
                }
            }
        }

        return $result;
    }

    public function scopePermissionsFromLevels(array $resourceScopes): array
    {
        $names = [];

        foreach ($resourceScopes as $resource => $level) {
            if (! in_array($resource, $this->scopableResources(), true)) {
                continue;
            }
            if (! in_array($level, self::LEVELS, true)) {
                continue;
            }
            $names[] = AccessCatalog::resourceScopePermission($resource, $level);
        }

        return $names;
    }
}
