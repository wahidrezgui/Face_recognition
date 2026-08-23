<?php

namespace App\Http\Controllers\Inertia;

use App\Application\AccessControl\RoleAccessService;
use App\Application\Identity\UserService;
use App\Domain\AccessControl\AccessCatalog;
use App\Domain\Identity\Models\User;
use App\Http\Controllers\Controller;
use App\Http\Requests\AccessControl\UpdatePermissionsRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class RoleAccessController extends Controller
{
    public function __construct(
        private readonly RoleAccessService $roleAccess,
        private readonly UserService $userService,
    ) {}

    public function index(Request $request): Response
    {
        $this->authorizePage($request);

        return Inertia::render('admin/RolePermissions', [
            'catalog' => $this->roleAccess->catalog(),
            'roles' => $this->roleAccess->listRoles(),
        ]);
    }

    public function showRole(Request $request, Role $role): JsonResponse
    {
        $this->authorizePage($request);

        return response()->json($this->roleAccess->getRole($role->id));
    }

    public function updateRolePermissions(UpdatePermissionsRequest $request, Role $role): JsonResponse
    {
        $this->authorizePage($request);

        $permissionNames = $this->roleAccess->permissionsFromRequest(
            $request->validated('routes', []),
            $request->validated('resources', []),
            $request->validated('scopes', []),
        );

        $updated = $this->roleAccess->syncRolePermissions($role->id, $permissionNames, $request->user());

        return response()->json($updated);
    }

    public function searchUsers(Request $request): JsonResponse
    {
        $this->authorizePage($request);

        $results = $this->userService->searchLite($request->user(), (string) $request->query('q', ''));

        return response()->json($results->values());
    }

    public function showUserPermissions(Request $request, User $user): JsonResponse
    {
        $this->authorizePage($request);

        return response()->json($this->roleAccess->getUserPermissionOverrides($user->id));
    }

    public function updateUserPermissions(UpdatePermissionsRequest $request, User $user): JsonResponse
    {
        $this->authorizePage($request);

        $permissionNames = $this->roleAccess->permissionsFromRequest(
            $request->validated('routes', []),
            $request->validated('resources', []),
            $request->validated('scopes', []),
        );

        $updated = $this->roleAccess->syncUserDirectPermissions($user->id, $permissionNames, $request->user());

        return response()->json($updated);
    }

    private function authorizePage(Request $request): void
    {
        abort_unless($request->user()->can(AccessCatalog::routePermission('role_permissions')), 403);
    }
}
