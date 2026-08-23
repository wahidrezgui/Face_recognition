<?php

namespace App\Http\Controllers\Inertia;

use App\Application\Personnel\DepartmentService;
use App\Application\Personnel\DepartmentTreeService;
use App\Domain\AccessControl\AccessCatalog;
use App\Domain\AccessControl\DataScopeResolver;
use App\Domain\Personnel\Models\Department;
use App\Http\Controllers\Controller;
use App\Http\Requests\Personnel\StoreDepartmentRequest;
use App\Http\Requests\Personnel\UpdateDepartmentRequest;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DepartmentController extends Controller
{
    public function __construct(
        private readonly DepartmentTreeService $departmentTree,
        private readonly DepartmentService $departmentService,
        private readonly DataScopeResolver $dataScope,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user->can(AccessCatalog::resourceReadPermission('departments')), 403);

        $scope = $this->dataScope->resolveForUser($user, 'departments');
        $userDepId = $this->dataScope->userDepartmentId($user);

        $departments = match ($scope) {
            'global' => $this->departmentTree->getNestedTree(),
            'self' => $userDepId > 0 ? $this->departmentTree->getSingleDepartment($userDepId) : [],
            default => $userDepId > 0 ? $this->departmentTree->getParentAndNestedDepartments($userDepId) : [],
        };

        return Inertia::render('admin/Departments', [
            'departments' => $departments,
            'bases' => $this->departmentService->basesPool($scope, $userDepId),
            'scope' => $scope,
            'scopeLabel' => $this->dataScope->scopeLabel($scope),
        ]);
    }

    public function store(StoreDepartmentRequest $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->can(AccessCatalog::resourceWritePermission('departments')), 403);

        $scope = $this->dataScope->resolveForUser($user, 'departments');
        $parentId = (int) ($request->input('parent_id') ?? 0);

        if ($scope === 'self') {
            throw new AuthorizationException('Cannot create departments in self scope.');
        }

        if ($scope !== 'global') {
            if ($parentId <= 0) {
                throw new AuthorizationException('Parent department is required.');
            }
            $this->dataScope->assertDepartmentInScope($user, 'departments', $parentId);
        }

        $this->departmentService->create($request->validated());

        return back();
    }

    public function update(UpdateDepartmentRequest $request, Department $department): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->can(AccessCatalog::resourceWritePermission('departments')), 403);

        $this->dataScope->assertDepartmentInScope($user, 'departments', $department->id);

        $this->departmentService->update($department, $request->validated());

        return back();
    }

    public function destroy(Request $request, Department $department): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->can(AccessCatalog::resourceWritePermission('departments')), 403);

        if ($this->dataScope->resolveForUser($user, 'departments') !== 'global') {
            throw new AuthorizationException('Global department scope required to delete.');
        }

        $this->dataScope->assertDepartmentInScope($user, 'departments', $department->id);

        $this->departmentService->delete($department);

        return back();
    }
}
