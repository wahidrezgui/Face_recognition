<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Stats\StatsScopeResolver;
use App\Services\Stats\StatsService;
use Illuminate\Http\Request;

class StatsController extends Controller
{
    public function __construct(
        private StatsService $stats,
        private StatsScopeResolver $scopeResolver,
    ) {
    }

    public function all()
    {
        return $this->stats->allStats();
    }

    public function show(int $id, Request $request)
    {
        $user = $request->user();
        $roleScope = $this->scopeResolver->resolveScopeForUser($user);
        $scope = $this->scopeResolver->clampScope($roleScope, $request->query('scope'));

        return $this->stats->stats($id, $scope);
    }

    public function notification(int $id)
    {
        return $this->stats->notification($id);
    }

    public function reports(int $id, Request $request)
    {
        $user = $request->user();
        $roleScope = $this->scopeResolver->resolveScopeForUser($user);
        $scope = $this->scopeResolver->clampScope($roleScope, $request->query('scope'));

        return $this->stats->reports($id, $scope);
    }

    public function saReports()
    {
        return $this->stats->saReports();
    }
}
