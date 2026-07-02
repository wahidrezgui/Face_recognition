<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\EmployeeController;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/employees', [EmployeeController::class, 'index']);
    Route::get('/employees/by-department', [EmployeeController::class, 'byDepartment']);
    Route::get('/employees/latest', [EmployeeController::class, 'latest']);
    Route::get('/employees/search', [EmployeeController::class, 'search']);
    Route::get('/employees/gate-directory', [EmployeeController::class, 'gateDirectory']);
    Route::get('/employees/{id}/gate-preview', [EmployeeController::class, 'gatePreview']);
    Route::get('/employees/{id}', [EmployeeController::class, 'show']);
    Route::get('/guests/{id}', [EmployeeController::class, 'guest']);
    Route::post('/employees', [EmployeeController::class, 'store']);
    Route::post('/employees/update', [EmployeeController::class, 'update']);
    Route::post('/employees/delete', [EmployeeController::class, 'destroy']);
    Route::post('/employees/approve', [EmployeeController::class, 'approve']);
    Route::post('/employees/import', [EmployeeController::class, 'import']);
    Route::post('/employees/search-military', [EmployeeController::class, 'searchMilitary']);

    Route::post('/employees/notes', [EmployeeController::class, 'addNote']);
    Route::delete('/employees/notes', [EmployeeController::class, 'deleteNote']);

    Route::post('/employees/cars', [EmployeeController::class, 'storeCar']);
    Route::post('/employees/cars/update', [EmployeeController::class, 'updateCar']);
    Route::post('/employees/cars/delete', [EmployeeController::class, 'destroyCar']);
    Route::get('/employees/cars/search-plate', [EmployeeController::class, 'searchPlate']);

    Route::get('/badges/{id}', [EmployeeController::class, 'badgeInfo']);
    Route::post('/badges/update', [EmployeeController::class, 'updateBadge']);
    Route::get('/badges/{id}/preview', [EmployeeController::class, 'guestBadge']);
    Route::get('/badges2/{id}', [EmployeeController::class, 'badge2Info']);
    Route::post('/badges2/update', [EmployeeController::class, 'updateBadge2']);
    Route::get('/badges2/{id}/preview', [EmployeeController::class, 'guestBadge2']);

    Route::get('/check-times/{id}', [EmployeeController::class, 'checkTimes']);
    Route::post('/check-times', [EmployeeController::class, 'storeCheckTime']);
    Route::post('/check-times/update', [EmployeeController::class, 'updateCheckTime']);
    Route::post('/check-times/delete', [EmployeeController::class, 'destroyCheckTime']);
});
