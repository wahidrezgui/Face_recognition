<?php

namespace App\Http\Controllers\Inertia;

use App\Application\Audit\ActivityLogService;
use App\Domain\AccessControl\AccessCatalog;
use App\Domain\Identity\Models\User;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ActivityLogController extends Controller
{
    public function __construct(private readonly ActivityLogService $activityLog) {}

    public function index(Request $request): Response
    {
        abort_unless($request->user()->can(AccessCatalog::routePermission('activity_log')), 403);

        $filters = $request->only(['created_by_id', 'employee_search', 'task', 'from_date', 'to_date', 'ip_address', 'page', 'per_page']);

        return Inertia::render('activityLog/ActivityLog', [
            'logs' => $this->activityLog->search($filters),
            'filters' => $filters,
            'users' => User::orderBy('firstname')->orderBy('lastname')->get(['id', 'firstname', 'lastname', 'username']),
        ]);
    }
}
