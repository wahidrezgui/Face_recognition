<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\StatsController;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/users', [UserController::class, 'index'])->middleware('role:Super Admin|Admin|Local Admin');
    Route::get('/users/{id}', [UserController::class, 'show'])->middleware('role:Super Admin|Admin|Local Admin');
    Route::post('/users', [UserController::class, 'store'])->middleware('role:Super Admin|Admin|Local Admin');
    Route::post('/users/update', [UserController::class, 'update'])->middleware('role:Super Admin|Admin|Local Admin');
    Route::post('/users/delete', [UserController::class, 'destroy'])->middleware('role:Super Admin');

    Route::get('/stats', [StatsController::class, 'all']);
    Route::get('/stats/{id}', [StatsController::class, 'show']);
    Route::get('/notifications/{id}', [StatsController::class, 'notification']);
    Route::get('/dashboard-reports/{id}', [StatsController::class, 'reports']);
    Route::get('/stats/super-admin/reports', [StatsController::class, 'saReports'])->middleware('role:Super Admin');
});
