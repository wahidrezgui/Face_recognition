<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\LookupController;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/lookups/ranks', [LookupController::class, 'ranks']);
    Route::get('/lookups/ranks/categories', [LookupController::class, 'rankCategories']);
    Route::get('/lookups/ranks/tree', [LookupController::class, 'ranksTree']);
    Route::get('/lookups/nationalities', [LookupController::class, 'nationalities']);
    Route::get('/lookups/bases/tree', [LookupController::class, 'basesTree']);
    Route::get('/lookups/gates/by-bases', [LookupController::class, 'gatesByBases']);
    Route::get('/lookups/zones', [LookupController::class, 'zones']);
    Route::get('/lookups/zones/{id}', [LookupController::class, 'zoneInfo']);
});
