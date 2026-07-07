<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\OrganizationController;

$readDepartments = config('roles.read_departments');
$writeDepartments = config('roles.write_departments');
$readCompanies = config('roles.read_companies');
$writeCompanies = config('roles.write_companies');

Route::middleware('auth:sanctum')->group(function () use (
    $readDepartments,
    $writeDepartments,
    $readCompanies,
    $writeCompanies
) {
    Route::get('/departments', [OrganizationController::class, 'departments'])->middleware($readDepartments);
    Route::get('/departments/all', [OrganizationController::class, 'allDepartments'])->middleware($readDepartments);
    Route::get('/departments/{parentId}/children', [OrganizationController::class, 'departmentTree'])->middleware($readDepartments);
    Route::get('/departments/{id}', [OrganizationController::class, 'departmentInfo'])->middleware($readDepartments);
    Route::post('/departments', [OrganizationController::class, 'storeDepartment'])->middleware($writeDepartments);
    Route::post('/departments/update', [OrganizationController::class, 'updateDepartment'])->middleware($writeDepartments);
    Route::post('/departments/delete', [OrganizationController::class, 'destroyDepartment'])->middleware($writeDepartments);

    Route::get('/companies/{parentId}', [OrganizationController::class, 'companies'])->middleware($readCompanies);
    Route::post('/companies', [OrganizationController::class, 'storeCompany'])->middleware($writeCompanies);
    Route::post('/companies/update', [OrganizationController::class, 'updateCompany'])->middleware($writeCompanies);
    Route::get('/companies/{id}/info', [OrganizationController::class, 'companyInfo'])->middleware($readCompanies);
    Route::get('/companies/{id}/summary', [OrganizationController::class, 'companySummary'])->middleware($readCompanies);
    Route::post('/departments/assign-base', [OrganizationController::class, 'assignBase'])->middleware($writeDepartments);

    Route::get('/bases', [OrganizationController::class, 'bases'])->middleware($readDepartments);
    Route::get('/bases/{id}', [OrganizationController::class, 'baseInfo'])->middleware($readDepartments);
    Route::post('/bases', [OrganizationController::class, 'storeBase'])->middleware($writeDepartments);
    Route::post('/bases/update', [OrganizationController::class, 'updateBase'])->middleware($writeDepartments);
    Route::post('/bases/delete', [OrganizationController::class, 'destroyBase'])->middleware($writeDepartments);

    Route::get('/gates', [OrganizationController::class, 'gates'])->middleware($readDepartments);
    Route::get('/gates/{id}', [OrganizationController::class, 'gateInfo'])->middleware($readDepartments);
    Route::post('/gates', [OrganizationController::class, 'storeGate'])->middleware($writeDepartments);
    Route::post('/gates/update', [OrganizationController::class, 'updateGate'])->middleware($writeDepartments);
    Route::post('/gates/delete', [OrganizationController::class, 'destroyGate'])->middleware($writeDepartments);

    Route::post('/zones', [OrganizationController::class, 'storeZone'])->middleware($writeDepartments);
    Route::post('/zones/update', [OrganizationController::class, 'updateZone'])->middleware($writeDepartments);
    Route::post('/zones/delete', [OrganizationController::class, 'destroyZone'])->middleware($writeDepartments);
});
