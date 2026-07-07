<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\RoleAccessController;

$manageRolePermissions = config('roles.manage_role_permissions');

Route::middleware(['auth:sanctum', $manageRolePermissions])->prefix('role-access')->group(function () {
    Route::get('/catalog', [RoleAccessController::class, 'catalog']);
    Route::get('/roles', [RoleAccessController::class, 'index']);
    Route::get('/roles/{id}', [RoleAccessController::class, 'show']);
    Route::put('/roles/{id}/permissions', [RoleAccessController::class, 'updatePermissions']);
    Route::post('/roles/{id}/users', [RoleAccessController::class, 'assignUser']);
    Route::delete('/roles/{id}/users/{userId}', [RoleAccessController::class, 'removeUser']);
});
