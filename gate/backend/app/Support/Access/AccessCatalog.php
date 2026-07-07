<?php

namespace App\Support\Access;

class AccessCatalog
{
    public const GUARD = 'web';

    public static function routePermission(string $routeKey): string
    {
        return "route.{$routeKey}";
    }

    public static function resourceReadPermission(string $resource): string
    {
        return "{$resource}.read";
    }

    public static function resourceWritePermission(string $resource): string
    {
        return "{$resource}.write";
    }

    public static function resourceScopePermission(string $resource, string $level): string
    {
        return "{$resource}.scope.{$level}";
    }

    public static function routes(): array
    {
        return config('access.routes', []);
    }

    public static function resources(): array
    {
        return config('access.resources', []);
    }

    public static function scopableResources(): array
    {
        return config('access.scopable_resources', []);
    }

    public static function scopeLevels(): array
    {
        return config('access.scope_levels', []);
    }

    public static function superAdminRole(): string
    {
        return (string) config('access.super_admin_role', 'Super Admin');
    }

    public static function allPermissionNames(): array
    {
        $names = [];

        foreach (array_keys(self::routes()) as $routeKey) {
            $names[] = self::routePermission($routeKey);
        }

        foreach (array_keys(self::resources()) as $resource) {
            $names[] = self::resourceReadPermission($resource);
            $names[] = self::resourceWritePermission($resource);
        }

        foreach (self::scopableResources() as $resource) {
            foreach (['global', 'hierarchy', 'self'] as $level) {
                $names[] = self::resourceScopePermission($resource, $level);
            }
        }

        return $names;
    }

    public static function catalogPayload(): array
    {
        return [
            'routes' => self::routes(),
            'resources' => self::resources(),
            'scopable_resources' => self::scopableResources(),
            'scope_levels' => self::scopeLevels(),
            'super_admin_role' => self::superAdminRole(),
        ];
    }

    public static function defaultPermissionsForRole(string $roleName): array
    {
        if ($roleName === self::superAdminRole()) {
            return self::allPermissionNames();
        }

        $permissions = [];
        $routeAccess = config("access.default_route_access.{$roleName}", []);
        $resourceAccess = config("access.default_resource_access.{$roleName}", []);
        $resourceScope = config("access.default_resource_scope.{$roleName}", []);

        if (in_array('*', $routeAccess, true)) {
            foreach (array_keys(self::routes()) as $routeKey) {
                $permissions[] = self::routePermission($routeKey);
            }
        } else {
            foreach ($routeAccess as $routeKey) {
                if (isset(self::routes()[$routeKey])) {
                    $permissions[] = self::routePermission($routeKey);
                }
            }
        }

        if (isset($resourceAccess['*'])) {
            foreach (array_keys(self::resources()) as $resource) {
                $actions = $resourceAccess['*'];
                if (in_array('read', $actions, true)) {
                    $permissions[] = self::resourceReadPermission($resource);
                }
                if (in_array('write', $actions, true)) {
                    $permissions[] = self::resourceWritePermission($resource);
                }
            }
        } else {
            foreach ($resourceAccess as $resource => $actions) {
                if (! isset(self::resources()[$resource]) || ! is_array($actions)) {
                    continue;
                }
                if (in_array('read', $actions, true)) {
                    $permissions[] = self::resourceReadPermission($resource);
                }
                if (in_array('write', $actions, true)) {
                    $permissions[] = self::resourceWritePermission($resource);
                }
            }
        }

        foreach ($resourceScope as $resource => $level) {
            if (in_array($level, ['global', 'hierarchy', 'self'], true)) {
                $permissions[] = self::resourceScopePermission($resource, $level);
            }
        }

        return array_values(array_unique($permissions));
    }

    public static function isKnownPermission(string $name): bool
    {
        return in_array($name, self::allPermissionNames(), true);
    }

    /**
     * @return array<int, string>
     */
    public static function assignableRoleNamesForActor(\App\Models\User $actor): array
    {
        $actor->loadMissing('roles');
        $actorRole = $actor->roles->first()?->name ?? '';
        $allowed = config("access.assignable_roles.{$actorRole}", []);

        if (in_array('*', $allowed, true)) {
            return \Spatie\Permission\Models\Role::query()
                ->where('guard_name', self::GUARD)
                ->orderBy('name')
                ->pluck('name')
                ->all();
        }

        return array_values(array_filter($allowed, 'is_string'));
    }

    /**
     * @return array<int, string>
     */
    public static function rolesRequiringDepartment(): array
    {
        return config('access.roles_requiring_department', []);
    }

    public static function roleRequiresDepartment(string $roleName): bool
    {
        return in_array($roleName, self::rolesRequiringDepartment(), true);
    }

    public static function actorCanAssignRole(\App\Models\User $actor, string $roleName): bool
    {
        return in_array($roleName, self::assignableRoleNamesForActor($actor), true);
    }
}
