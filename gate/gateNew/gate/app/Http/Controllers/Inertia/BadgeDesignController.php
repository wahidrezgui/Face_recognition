<?php

namespace App\Http\Controllers\Inertia;

use App\Application\Personnel\BadgeDesignerService;
use App\Application\Personnel\DepartmentTreeService;
use App\Application\Personnel\EmployeeService;
use App\Domain\AccessControl\AccessCatalog;
use App\Domain\Personnel\Models\Department;
use App\Http\Controllers\Controller;
use App\Http\Requests\Personnel\StoreBadgeDesignRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BadgeDesignController extends Controller
{
    public function __construct(
        private readonly BadgeDesignerService $badgeDesigner,
        private readonly DepartmentTreeService $departmentTree,
        private readonly EmployeeService $employeeService,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user->can(AccessCatalog::resourceReadPermission('employees')), 403);

        return Inertia::render('badge/Badge', [
            'departments' => $this->departmentTree->getNestedTree(),
            'tokenKeys' => $this->badgeDesigner->tokenKeys(),
            'bases' => $this->employeeService->basesWithZones(),
        ]);
    }

    /**
     * Same designer page as index(), scoped to companies instead of ordinary
     * departments — a flat picker (companies have no children of their own)
     * rather than the org-unit tree.
     */
    public function companyIndex(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user->can(AccessCatalog::resourceReadPermission('employees')), 403);

        return Inertia::render('badge/Badge', [
            'departments' => [],
            'companies' => $this->departmentTree->getCompaniesFlatList(),
            'tokenKeys' => $this->badgeDesigner->tokenKeys(),
            'bases' => $this->employeeService->basesWithZones(),
        ]);
    }

    public function show(Request $request, Department $department): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->can(AccessCatalog::resourceReadPermission('employees')), 403);

        return response()->json($this->badgeDesigner->loadForDepartment($department->id));
    }

    public function storeFront(StoreBadgeDesignRequest $request, Department $department): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->can(AccessCatalog::resourceWritePermission('employees')), 403);

        $saved = $this->badgeDesigner->saveSide(
            $department->id,
            'front',
            $request->validated(),
            $request->boolean('apply_to_children'),
            $this->departmentTree,
        );

        return response()->json($saved);
    }

    public function storeBack(StoreBadgeDesignRequest $request, Department $department): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->can(AccessCatalog::resourceWritePermission('employees')), 403);

        $saved = $this->badgeDesigner->saveSide(
            $department->id,
            'back',
            $request->validated(),
            $request->boolean('apply_to_children'),
            $this->departmentTree,
        );

        return response()->json($saved);
    }
}
