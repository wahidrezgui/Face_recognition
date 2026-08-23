<?php

namespace App\Http\Controllers\Inertia;

use App\Application\Gate\DashboardStatsService;
use App\Domain\AccessControl\AccessCatalog;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(private readonly DashboardStatsService $dashboardStatsService) {}

    public function __invoke(Request $request): Response
    {
        abort_unless($request->user()->can(AccessCatalog::routePermission('dashboard')), 403);

        return Inertia::render('Dashboard', [
            'stats' => $this->dashboardStatsService->globalStats(),
        ]);
    }
}
