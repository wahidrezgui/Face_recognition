<?php

namespace App\Http\Controllers\Inertia;

use App\Application\Identity\UserService;
use App\Application\Personnel\DepartmentService;
use App\Application\Personnel\DepartmentTreeService;
use App\Domain\AccessControl\AccessCatalog;
use App\Domain\AccessControl\DataScopeResolver;
use App\Domain\Identity\Models\User;
use App\Http\Controllers\Controller;
use App\Http\Requests\Identity\StoreUserRequest;
use App\Http\Requests\Identity\UpdateUserRequest;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function __construct(
        private readonly UserService $userService,
        private readonly DepartmentTreeService $departmentTree,
        private readonly DepartmentService $departmentService,
        private readonly DataScopeResolver $dataScope,
    ) {}

    public function index(Request $request): Response
    {
        $actor = $request->user();
        abort_unless($actor->can(AccessCatalog::resourceReadPermission('users')), 403);

        $filters = $request->only(['search', 'military_number', 'dep_id', 'role', 'sso_status', 'page', 'per_page', 'sort_field', 'sort_order']);
        $scope = $this->dataScope->resolveForUser($actor, 'users');
        $userDepId = $this->dataScope->userDepartmentId($actor);

        $departments = match ($scope) {
            'global' => $this->departmentTree->getNestedTree(),
            'self' => $userDepId > 0 ? $this->departmentTree->getSingleDepartment($userDepId) : [],
            default => $userDepId > 0 ? $this->departmentTree->getParentAndNestedDepartments($userDepId) : [],
        };

        return Inertia::render('admin/Users', [
            'users' => $this->userService->list($actor, $filters),
            'filters' => $filters,
            'departments' => $departments,
            'bases' => $this->departmentService->basesPool($scope, $userDepId),
            'assignableRoles' => AccessCatalog::assignableRoleNamesForActor($actor),
            'rolesRequiringDepartment' => AccessCatalog::rolesRequiringDepartment(),
            'scope' => $scope,
            'scopeLabel' => $this->dataScope->scopeLabel($scope),
            'superAdminCount' => (int) User::role(AccessCatalog::superAdminRole())->count(),
        ]);
    }

    public function store(StoreUserRequest $request): RedirectResponse
    {
        $actor = $request->user();
        abort_unless($actor->can(AccessCatalog::resourceWritePermission('users')), 403);

        if ($request->filled('dep_id')) {
            $this->dataScope->assertDepartmentInScope($actor, 'users', (int) $request->input('dep_id'));
        }

        $this->userService->create($request->validated(), $actor);

        return back();
    }

    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        $actor = $request->user();
        abort_unless($actor->can(AccessCatalog::resourceWritePermission('users')), 403);

        // Skip the scope check against the target's *existing* department when it
        // has none yet (pending Keycloak accounts) — otherwise a hierarchy-scoped
        // admin could never open one to activate it.
        if ($user->dep_id) {
            $this->dataScope->assertDepartmentInScope($actor, 'users', (int) $user->dep_id);
        }
        if ($request->filled('dep_id')) {
            $this->dataScope->assertDepartmentInScope($actor, 'users', (int) $request->input('dep_id'));
        }

        $this->userService->assertRoleChangeAllowed($actor, $user, (string) $request->validated('role'));
        $this->userService->update($user, $request->validated(), $actor);

        return back();
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        $actor = $request->user();
        abort_unless($actor->can(AccessCatalog::resourceWritePermission('users')), 403);

        if ($this->dataScope->resolveForUser($actor, 'users') !== 'global') {
            throw new AuthorizationException('Global scope required to delete users.');
        }

        $this->userService->assertDeletable($actor, $user);
        $this->userService->delete($user);

        return back();
    }
}
