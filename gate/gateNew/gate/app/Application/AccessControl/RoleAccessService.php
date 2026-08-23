<?php

namespace App\Application\AccessControl;

use App\Domain\AccessControl\AccessCatalog;
use App\Domain\AccessControl\DataScopeResolver;
use App\Domain\Identity\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleAccessService
{
    public function __construct(private readonly DataScopeResolver $dataScope) {}

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
                (int) ($userCounts[$role->id] ?? 0),
            ))
            ->values()
            ->all();
    }

    public function getRole(int $roleId): array
    {
        $role = $this->findRole($roleId);
        $isSuperAdmin = $role->name === AccessCatalog::superAdminRole();

        $role->load('permissions');
        $users = $this->usersForRole($role);
        $names = $isSuperAdmin ? AccessCatalog::allPermissionNames() : $role->permissions->pluck('name')->all();

        return [
            'role' => $this->mapRoleSummary($role, $isSuperAdmin, $users->count()),
            'permissions' => array_values($names),
            'route_permissions' => $this->extractRoutePermissions($names),
            'resource_permissions' => $this->extractResourcePermissions($names),
            'resource_scopes' => $this->dataScope->extractScopePermissions($names),
            'locked' => $isSuperAdmin,
        ];
    }

    public function syncRolePermissions(int $roleId, array $permissionNames, User $actor): array
    {
        $role = $this->findRole($roleId);

        if ($role->name === AccessCatalog::superAdminRole()) {
            throw ValidationException::withMessages([
                'permissions' => ['Super Admin permissions cannot be edited.'],
            ]);
        }

        $validated = $this->validatePermissionNames($permissionNames);
        $this->ensurePermissionsExist();
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

    /**
     * Direct-only permission breakdown for a user, plus their role-derived
     * permissions shown separately as read-only context — the grid only ever
     * edits direct permissions, never role permissions, from this endpoint.
     */
    public function getUserPermissionOverrides(int $userId): array
    {
        $user = User::query()->with('roles')->findOrFail($userId);
        $directNames = $user->getDirectPermissions()->pluck('name')->all();
        $roleNames = $user->getPermissionsViaRoles()->pluck('name')->all();

        return [
            'user' => [
                'id' => $user->id,
                'firstname' => $user->firstname,
                'lastname' => $user->lastname,
                'username' => $user->username,
                'role' => $user->roles->first()?->name,
            ],
            'role_permissions' => array_values($roleNames),
            'direct_permissions' => array_values($directNames),
            'route_permissions' => $this->extractRoutePermissions($directNames),
            'resource_permissions' => $this->extractResourcePermissions($directNames),
            'resource_scopes' => $this->dataScope->extractScopePermissions($directNames),
        ];
    }

    public function syncUserDirectPermissions(int $userId, array $permissionNames, User $actor): array
    {
        $user = User::query()->findOrFail($userId);
        $validated = $this->validatePermissionNames($permissionNames);
        $this->ensurePermissionsExist();
        $user->syncPermissions($validated);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        Log::info('user_permissions_updated', [
            'actor_id' => $actor->id,
            'user_id' => $user->id,
            'permission_count' => count($validated),
        ]);

        return $this->getUserPermissionOverrides($user->id);
    }

    /**
     * @return array{routes: string[], resources: array<string, string>, scopes: array<string, string>}
     */
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

    /**
     * Materializes any permission name from the config-driven catalog that
     * doesn't have a real `Permission` row yet — keeps the catalog and the
     * actual assignable set in sync without a manual seeding step whenever
     * config/access.php grows a new route or resource.
     */
    private function ensurePermissionsExist(): void
    {
        $existing = Permission::where('guard_name', AccessCatalog::GUARD)->pluck('name')->all();
        $missing = array_diff(AccessCatalog::allPermissionNames(), $existing);

        foreach ($missing as $name) {
            Permission::findOrCreate($name, AccessCatalog::GUARD);
        }
    }

    private function findRole(int $roleId): Role
    {
        return Role::query()->where('guard_name', AccessCatalog::GUARD)->findOrFail($roleId);
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
        $table = config('permission.table_names.model_has_roles', 'model_has_roles');

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
            ->whereHas('roles', fn ($query) => $query->where('roles.id', $role->id))
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
                    'permissions' => ["Unknown permission: {$name}"],
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

            $result[$resource] = match (true) {
                $hasWrite => 'write',
                $hasRead => 'read',
                default => 'none',
            };
        }

        return $result;
    }
}
