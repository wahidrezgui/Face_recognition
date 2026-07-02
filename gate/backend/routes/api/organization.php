<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\OrganizationController;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/departments', [OrganizationController::class, 'departments']);
    Route::get('/departments/all', [OrganizationController::class, 'allDepartments']);
    Route::get('/departments/{parentId}/children', [OrganizationController::class, 'departmentTree']);
    Route::get('/departments/{id}', [OrganizationController::class, 'departmentInfo']);
    Route::post('/departments', [OrganizationController::class, 'storeDepartment']);
    Route::post('/departments/update', [OrganizationController::class, 'updateDepartment']);
    Route::post('/departments/delete', [OrganizationController::class, 'destroyDepartment']);

    Route::get('/companies/{parentId}', [OrganizationController::class, 'companies']);
    Route::post('/companies', [OrganizationController::class, 'storeCompany']);
    Route::post('/companies/update', [OrganizationController::class, 'updateCompany']);
    Route::get('/companies/{id}/info', [OrganizationController::class, 'companyInfo']);
    Route::get('/companies/{id}/summary', [OrganizationController::class, 'companySummary']);
    Route::post('/departments/assign-base', [OrganizationController::class, 'assignBase']);

    Route::get('/bases', [OrganizationController::class, 'bases']);
    Route::get('/bases/{id}', [OrganizationController::class, 'baseInfo']);
    Route::post('/bases', [OrganizationController::class, 'storeBase']);
    Route::post('/bases/update', [OrganizationController::class, 'updateBase']);
    Route::post('/bases/delete', [OrganizationController::class, 'destroyBase']);

    Route::get('/gates', [OrganizationController::class, 'gates']);
    Route::get('/gates/{id}', [OrganizationController::class, 'gateInfo']);
    Route::post('/gates', [OrganizationController::class, 'storeGate']);
    Route::post('/gates/update', [OrganizationController::class, 'updateGate']);
    Route::post('/gates/delete', [OrganizationController::class, 'destroyGate']);

    Route::post('/zones', [OrganizationController::class, 'storeZone']);
    Route::post('/zones/update', [OrganizationController::class, 'updateZone']);
    Route::post('/zones/delete', [OrganizationController::class, 'destroyZone']);
});
