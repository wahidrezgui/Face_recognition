<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Stats\StatsScopeResolver;
use App\Services\Stats\StatsService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;

class StatsController extends Controller
{
    public function __construct(
        private StatsService $stats,
        private StatsScopeResolver $scopeResolver,
    ) {
    }

    public function all(Request $request)
    {
        $user = $request->user();
        if ($this->scopeResolver->resolveScopeForUser($user) !== 'global') {
            throw new AuthorizationException('Global dashboard scope required.');
        }

        return $this->stats->allStats();
    }

    public function show(int $id, Request $request)
    {
        $user = $request->user();
        $roleScope = $this->scopeResolver->resolveScopeForUser($user);

        if ($roleScope === 'global') {
            return $this->stats->allStats();
        }

        $depId = (int) ($user->dep_id ?? $id);
        if ($depId <= 0) {
            return response()->json(['message' => 'Department is missing for this account.'], 422);
        }

        $scope = $this->scopeResolver->clampScope($roleScope, $request->query('scope'));

        return $this->stats->stats($depId, $scope);
    }

    public function notification(int $id)
    {
        return $this->stats->notification($id);
    }

    public function reports(int $id, Request $request)
    {
        $user = $request->user();
        $roleScope = $this->scopeResolver->resolveScopeForUser($user);

        if ($roleScope === 'global') {
            return $this->stats->saReports();
        }

        $depId = (int) ($user->dep_id ?? $id);
        if ($depId <= 0) {
            return response()->json(['message' => 'Department is missing for this account.'], 422);
        }

        $scope = $this->scopeResolver->clampScope($roleScope, $request->query('scope'));

        return $this->stats->reports($depId, $scope);
    }

    public function saReports(Request $request)
    {
        $user = $request->user();
        if ($this->scopeResolver->resolveScopeForUser($user) !== 'global') {
            throw new AuthorizationException('Global dashboard scope required.');
        }

        return $this->stats->saReports();
    }
}
