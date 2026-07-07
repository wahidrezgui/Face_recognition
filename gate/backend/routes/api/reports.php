<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ReportController;

$readReports = config('roles.read_reports');
$writeReports = config('roles.write_reports');

Route::middleware('auth:sanctum')->group(function () use ($readReports, $writeReports) {
    Route::get('/reports/attendance', [ReportController::class, 'attendance'])->middleware($readReports);
    Route::get('/reports/issues', [ReportController::class, 'issues'])->middleware($readReports);
    Route::get('/reports/companies', [ReportController::class, 'companies'])->middleware($readReports);
    Route::get('/reports/companies/issues', [ReportController::class, 'companyIssues'])->middleware($readReports);
    Route::get('/reports/departments', [ReportController::class, 'departments'])->middleware($readReports);
    Route::get('/reports/individual', [ReportController::class, 'individual'])->middleware($readReports);
    Route::post('/reports/advanced', [ReportController::class, 'advanced'])->middleware($writeReports);
    Route::get('/reports/late-employees-percentage', [ReportController::class, 'lateEmployeesPercentage'])->middleware($readReports);
});
