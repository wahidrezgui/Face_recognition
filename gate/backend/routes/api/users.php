<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\StatsController;

$readUsers = config('roles.read_users');
$writeUsers = config('roles.write_users');
$readReports = config('roles.read_reports');
$manageRolePermissions = config('roles.manage_role_permissions');

Route::middleware('auth:sanctum')->group(function () use ($readUsers, $writeUsers, $readReports) {
    Route::get('/users/assignable-roles', [UserController::class, 'assignableRoles'])->middleware($readUsers);
    Route::get('/users', [UserController::class, 'index'])->middleware($readUsers);
    Route::get('/users/{id}', [UserController::class, 'show'])->middleware($readUsers);
    Route::post('/users', [UserController::class, 'store'])->middleware($writeUsers);
    Route::post('/users/update', [UserController::class, 'update'])->middleware($writeUsers);
    Route::post('/users/delete', [UserController::class, 'destroy'])->middleware($writeUsers);

    Route::get('/stats', [StatsController::class, 'all']);
    Route::get('/stats/{id}', [StatsController::class, 'show']);
    Route::get('/notifications/{id}', [StatsController::class, 'notification']);
    Route::get('/dashboard-reports/{id}', [StatsController::class, 'reports']);
    Route::get('/stats/super-admin/reports', [StatsController::class, 'saReports'])
        ->middleware('permission:route.dashboard|route.home');
});
