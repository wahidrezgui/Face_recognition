<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\EmployeeController;

$readEmployees = config('roles.read_employees');
$writeEmployees = config('roles.write_employees');
$readSettings = config('roles.read_settings');
$writeSettings = config('roles.write_settings');

Route::middleware('auth:sanctum')->group(function () use ($readEmployees, $writeEmployees, $readSettings, $writeSettings) {
    Route::get('/employees', [EmployeeController::class, 'index'])->middleware($readEmployees);
    Route::get('/employees/by-department', [EmployeeController::class, 'byDepartment'])->middleware($readEmployees);
    Route::get('/employees/latest', [EmployeeController::class, 'latest'])->middleware($readEmployees);
    Route::get('/employees/search', [EmployeeController::class, 'search'])->middleware($readEmployees);
    Route::get('/employees/gate-directory', [EmployeeController::class, 'gateDirectory']);
    Route::get('/employees/{id}/gate-preview', [EmployeeController::class, 'gatePreview']);
    Route::get('/employees/{id}', [EmployeeController::class, 'show'])->middleware($readEmployees);
    Route::get('/guests/{id}', [EmployeeController::class, 'guest'])->middleware($readEmployees);
    Route::post('/employees', [EmployeeController::class, 'store'])->middleware($writeEmployees);
    Route::post('/employees/update', [EmployeeController::class, 'update'])->middleware($writeEmployees);
    Route::post('/employees/delete', [EmployeeController::class, 'destroy'])->middleware($writeEmployees);
    Route::post('/employees/approve', [EmployeeController::class, 'approve'])->middleware($writeEmployees);
    Route::post('/employees/import', [EmployeeController::class, 'import'])->middleware($writeEmployees);
    Route::post('/employees/search-military', [EmployeeController::class, 'searchMilitary'])->middleware($readEmployees);

    Route::post('/employees/notes', [EmployeeController::class, 'addNote'])->middleware($writeEmployees);
    Route::delete('/employees/notes', [EmployeeController::class, 'deleteNote'])->middleware($writeEmployees);

    Route::post('/employees/cars', [EmployeeController::class, 'storeCar'])->middleware($writeEmployees);
    Route::post('/employees/cars/update', [EmployeeController::class, 'updateCar'])->middleware($writeEmployees);
    Route::post('/employees/cars/delete', [EmployeeController::class, 'destroyCar'])->middleware($writeEmployees);
    Route::get('/employees/cars/search-plate', [EmployeeController::class, 'searchPlate'])->middleware($readEmployees);

    Route::get('/badges/{id}', [EmployeeController::class, 'badgeInfo'])->middleware($readEmployees);
    Route::post('/badges/update', [EmployeeController::class, 'updateBadge'])->middleware($writeEmployees);
    Route::post('/badges/bulk-preview', [EmployeeController::class, 'bulkGuestBadgePreview'])->middleware($readEmployees);
    Route::get('/badges/{id}/preview', [EmployeeController::class, 'guestBadge'])->middleware($readEmployees);
    Route::get('/badges2/{id}', [EmployeeController::class, 'badge2Info'])->middleware($readEmployees);
    Route::post('/badges2/update', [EmployeeController::class, 'updateBadge2'])->middleware($writeEmployees);
    Route::get('/badges2/{id}/preview', [EmployeeController::class, 'guestBadge2'])->middleware($readEmployees);

    Route::get('/check-times/{id}', [EmployeeController::class, 'checkTimes'])->middleware($readSettings);
    Route::post('/check-times', [EmployeeController::class, 'storeCheckTime'])->middleware($writeSettings);
    Route::post('/check-times/update', [EmployeeController::class, 'updateCheckTime'])->middleware($writeSettings);
    Route::post('/check-times/delete', [EmployeeController::class, 'destroyCheckTime'])->middleware($writeSettings);
});
