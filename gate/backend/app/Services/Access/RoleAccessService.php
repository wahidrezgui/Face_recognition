<?php

namespace App\Services\Access;

use App\Models\User;
use App\Support\Access\AccessCatalog;
use App\Support\Access\DataScopeResolver;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleAccessService
{
    public function __construct(private DataScopeResolver $dataScope)
    {
    }

    public function catalog(): array
    {
        return AccessCatalog::catalogPayload();
    }

    public function listRoles(): array
    {
        $superAdmin = AccessCatalog::superAdminRole();
        $userCounts = $this->userCountsByRoleId();

        return Role::query()
            ->where('guard_name', AccessCatalog::GUARD)
            ->withCount('permissions')
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role) => $this->mapRoleSummary(
                $role,
                $role->name === $superAdmin,
                (int) ($userCounts[$role->id] ?? 0)
            ))
            ->values()
            ->all();
    }

    public function getRole(int $roleId): array
    {
        $role = $this->findRole($roleId);
        $superAdmin = AccessCatalog::superAdminRole();
        $isSuperAdmin = $role->name === $superAdmin;

        $role->load('permissions');
        $users = $this->usersForRole($role);

        return [
            'role' => $this->mapRoleSummary($role, $isSuperAdmin, $users->count()),
            'permissions' => $isSuperAdmin
                ? AccessCatalog::allPermissionNames()
                : $role->permissions->pluck('name')->values()->all(),
            'route_permissions' => $this->extractRoutePermissions(
                $isSuperAdmin ? AccessCatalog::allPermissionNames() : $role->permissions->pluck('name')->all()
            ),
            'resource_permissions' => $this->extractResourcePermissions(
                $isSuperAdmin ? AccessCatalog::allPermissionNames() : $role->permissions->pluck('name')->all()
            ),
            'resource_scopes' => $isSuperAdmin
                ? $this->dataScope->extractScopePermissions(AccessCatalog::allPermissionNames())
                : $this->dataScope->extractScopePermissions($role->permissions->pluck('name')->all()),
            'users' => $users->map(fn (User $user) => [
                'id' => $user->id,
                'firstname' => $user->firstname,
                'lastname' => $user->lastname,
                'username' => $user->username,
                'dep_id' => $user->dep_id,
            ])->values()->all(),
            'locked' => $isSuperAdmin,
        ];
    }

    public function syncRolePermissions(int $roleId, array $permissionNames, User $actor): array
    {
        $role = $this->findRole($roleId);

        if ($role->name === AccessCatalog::superAdminRole()) {
            throw ValidationException::withMessages([
                'permissions' => ['لا يمكن تعديل صلاحيات مدير النظام'],
            ]);
        }

        $validated = $this->validatePermissionNames($permissionNames);
        $role->syncPermissions($validated);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        Log::info('role_permissions_updated', [
            'actor_id' => $actor->id,
            'role_id' => $role->id,
            'role_name' => $role->name,
            'permission_count' => count($validated),
        ]);

        return $this->getRole($role->id);
    }

    public function assignUserToRole(int $roleId, int $userId, User $actor): array
    {
        $role = $this->findRole($roleId);
        $user = User::query()->findOrFail($userId);

        $user->syncRoles([$role->name]);

        Log::info('role_user_assigned', [
            'actor_id' => $actor->id,
            'role_id' => $role->id,
            'role_name' => $role->name,
            'user_id' => $user->id,
        ]);

        return $this->getRole($role->id);
    }

    public function removeUserFromRole(int $roleId, int $userId, User $actor): array
    {
        $role = $this->findRole($roleId);
        $user = User::query()->with('roles')->findOrFail($userId);

        if ($role->name === AccessCatalog::superAdminRole()) {
            $remaining = User::role(AccessCatalog::superAdminRole())->where('id', '!=', $user->id)->count();
            if ($remaining < 1) {
                throw ValidationException::withMessages([
                    'user_id' => ['يجب أن يبقى مدير نظام واحد على الأقل'],
                ]);
            }
        }

        if (! $user->hasRole($role->name)) {
            throw ValidationException::withMessages([
                'user_id' => ['المستخدم غير مرتبط بهذا الدور'],
            ]);
        }

        $user->removeRole($role->name);

        Log::info('role_user_removed', [
            'actor_id' => $actor->id,
            'role_id' => $role->id,
            'role_name' => $role->name,
            'user_id' => $user->id,
        ]);

        return $this->getRole($role->id);
    }

    public function permissionsFromRequest(array $routeKeys, array $resourceLevels, array $resourceScopes = []): array
    {
        $names = [];

        foreach ($routeKeys as $routeKey) {
            if (! isset(AccessCatalog::routes()[$routeKey])) {
                continue;
            }
            $names[] = AccessCatalog::routePermission($routeKey);
        }

        foreach ($resourceLevels as $resource => $level) {
            if (! isset(AccessCatalog::resources()[$resource])) {
                continue;
            }
            if ($level === 'read' || $level === 'write') {
                $names[] = AccessCatalog::resourceReadPermission($resource);
            }
            if ($level === 'write') {
                $names[] = AccessCatalog::resourceWritePermission($resource);
            }
        }

        $names = array_merge($names, $this->dataScope->scopePermissionsFromLevels($resourceScopes));

        return array_values(array_unique($names));
    }

    private function findRole(int $roleId): Role
    {
        return Role::query()
            ->where('guard_name', AccessCatalog::GUARD)
            ->findOrFail($roleId);
    }

    private function mapRoleSummary(Role $role, bool $locked, int $usersCount = 0): array
    {
        return [
            'id' => $role->id,
            'name' => $role->name,
            'users_count' => $usersCount,
            'permissions_count' => $locked
                ? count(AccessCatalog::allPermissionNames())
                : ($role->permissions_count ?? $role->permissions()->count()),
            'locked' => $locked,
        ];
    }

    private function userCountsByRoleId(): Collection
    {
        $table = config('permission.table_names.model_has_roles');

        return DB::table($table)
            ->where('model_type', User::class)
            ->selectRaw('role_id, count(*) as aggregate')
            ->groupBy('role_id')
            ->pluck('aggregate', 'role_id');
    }

    private function usersForRole(Role $role): Collection
    {
        return User::query()
            ->select('id', 'firstname', 'lastname', 'username', 'dep_id')
            ->whereHas('roles', function ($query) use ($role) {
                $query->where('roles.id', $role->id);
            })
            ->orderBy('firstname')
            ->orderBy('lastname')
            ->get();
    }

    private function validatePermissionNames(array $permissionNames): array
    {
        $validated = [];

        foreach ($permissionNames as $name) {
            if (! is_string($name) || ! AccessCatalog::isKnownPermission($name)) {
                throw ValidationException::withMessages([
                    'permissions' => ["صلاحية غير معروفة: {$name}"],
                ]);
            }
            $validated[] = $name;
        }

        return array_values(array_unique($validated));
    }

    private function extractRoutePermissions(array $permissionNames): array
    {
        $selected = collect($permissionNames);
        $result = [];

        foreach (AccessCatalog::routes() as $key => $route) {
            $result[$key] = $selected->contains(AccessCatalog::routePermission($key));
        }

        return $result;
    }

    private function extractResourcePermissions(array $permissionNames): array
    {
        $selected = collect($permissionNames);
        $result = [];

        foreach (AccessCatalog::resources() as $resource => $meta) {
            $hasRead = $selected->contains(AccessCatalog::resourceReadPermission($resource));
            $hasWrite = $selected->contains(AccessCatalog::resourceWritePermission($resource));

            if ($hasWrite) {
                $result[$resource] = 'write';
            } elseif ($hasRead) {
                $result[$resource] = 'read';
            } else {
                $result[$resource] = 'none';
            }
        }

        return $result;
    }
}
