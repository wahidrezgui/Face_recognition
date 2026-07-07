<?php

namespace App\Services\Stats;

use App\Models\User;
use App\Support\Access\DataScopeResolver;

class StatsScopeResolver
{
    public function __construct(private DataScopeResolver $dataScope)
    {
    }

    public function resolveScopeForUser(User $user): string
    {
        return $this->dataScope->resolveForUser($user, 'dashboard');
    }

    public function clampScope(string $roleScope, ?string $requestedScope): string
    {
        return $this->dataScope->clampScope($roleScope, $requestedScope);
    }

    public function resolveDepartmentIds(int $departmentId, string $scope): array
    {
        return $this->dataScope->resolveDepartmentIdsForScope($departmentId, $scope);
    }

    public function scopeLabel(string $scope): string
    {
        return $this->dataScope->scopeLabel($scope);
    }
}
