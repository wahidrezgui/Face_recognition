<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ReportController;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/reports/attendance', [ReportController::class, 'attendance']);
    Route::get('/reports/issues', [ReportController::class, 'issues']);
    Route::get('/reports/companies', [ReportController::class, 'companies']);
    Route::get('/reports/companies/issues', [ReportController::class, 'companyIssues']);
    Route::get('/reports/departments', [ReportController::class, 'departments']);
    Route::get('/reports/individual', [ReportController::class, 'individual']);
    Route::post('/reports/advanced', [ReportController::class, 'advanced']);
    Route::get('/reports/late-employees-percentage', [ReportController::class, 'lateEmployeesPercentage']);
});
