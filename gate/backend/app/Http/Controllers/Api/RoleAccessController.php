<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Access\RoleAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoleAccessController extends Controller
{
    public function __construct(private RoleAccessService $roleAccess)
    {
    }

    public function catalog(): JsonResponse
    {
        return response()->json($this->roleAccess->catalog());
    }

    public function index(): JsonResponse
    {
        return response()->json([
            'roles' => $this->roleAccess->listRoles(),
        ]);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json($this->roleAccess->getRole($id));
    }

    public function updatePermissions(Request $request, int $id): JsonResponse
    {
        $payload = $request->validate([
            'routes' => ['sometimes', 'array'],
            'routes.*' => ['string'],
            'resources' => ['sometimes', 'array'],
            'resources.*' => ['string', 'in:none,read,write'],
            'scopes' => ['sometimes', 'array'],
            'scopes.*' => ['string', 'in:none,global,hierarchy,self'],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string'],
        ]);

        if (isset($payload['permissions'])) {
            $permissionNames = $payload['permissions'];
        } else {
            $scopeLevels = [];
            foreach ($payload['scopes'] ?? [] as $resource => $level) {
                if ($level !== 'none') {
                    $scopeLevels[$resource] = $level;
                }
            }

            $permissionNames = $this->roleAccess->permissionsFromRequest(
                $payload['routes'] ?? [],
                $payload['resources'] ?? [],
                $scopeLevels
            );
        }

        return response()->json(
            $this->roleAccess->syncRolePermissions($id, $permissionNames, $request->user())
        );
    }

    public function assignUser(Request $request, int $id): JsonResponse
    {
        $payload = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        return response()->json(
            $this->roleAccess->assignUserToRole($id, (int) $payload['user_id'], $request->user())
        );
    }

    public function removeUser(Request $request, int $id, int $userId): JsonResponse
    {
        return response()->json(
            $this->roleAccess->removeUserFromRole($id, $userId, $request->user())
        );
    }
}
