<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\MovementController;

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/movements/check', [MovementController::class, 'check']);
    Route::post('/movements/check/manual', [MovementController::class, 'checkManual']);
    Route::post('/movements/check/submit', [MovementController::class, 'checkSubmit']);
    Route::post('/movements/sync', [MovementController::class, 'syncOffline']);
    Route::get('/employees/{id}/movements/latest', [MovementController::class, 'latestForEmployee']);
    Route::get('/companies/{id}/check-in-out', [MovementController::class, 'companyCheckInOut']);
});
