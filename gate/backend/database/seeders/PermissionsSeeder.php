<?php

namespace Database\Seeders;

use App\Support\Access\AccessCatalog;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class PermissionsSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (AccessCatalog::allPermissionNames() as $name) {
            Permission::firstOrCreate([
                'name' => $name,
                'guard_name' => AccessCatalog::GUARD,
            ]);
        }

        $this->remapLegacyPermissions();

        $roles = Role::query()
            ->where('guard_name', AccessCatalog::GUARD)
            ->get()
            ->keyBy('name');

        foreach ($roles as $roleName => $role) {
            $permissions = AccessCatalog::defaultPermissionsForRole($roleName);
            $role->syncPermissions($permissions);

            Log::info('permissions_seeded_for_role', [
                'role' => $roleName,
                'permission_count' => count($permissions),
            ]);
        }
    }

    private function remapLegacyPermissions(): void
    {
        $remap = config('access.permission_remap', []);
        $pivotTable = config('permission.table_names.role_has_permissions');
        $permissionTable = config('permission.table_names.permissions');

        foreach ($remap as $oldName => $newName) {
            $oldPermission = Permission::query()
                ->where('name', $oldName)
                ->where('guard_name', AccessCatalog::GUARD)
                ->first();

            $newPermission = Permission::query()
                ->where('name', $newName)
                ->where('guard_name', AccessCatalog::GUARD)
                ->first();

            if (! $oldPermission || ! $newPermission) {
                continue;
            }

            $roleIds = DB::table($pivotTable)
                ->where('permission_id', $oldPermission->id)
                ->pluck('role_id');

            foreach ($roleIds as $roleId) {
                DB::table($pivotTable)->updateOrInsert(
                    [
                        'permission_id' => $newPermission->id,
                        'role_id' => $roleId,
                    ],
                    []
                );
            }

            DB::table($pivotTable)->where('permission_id', $oldPermission->id)->delete();
            DB::table($permissionTable)->where('id', $oldPermission->id)->delete();
        }
    }
}
