<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\KeycloakAuthController;

Route::get('/auth/providers', [KeycloakAuthController::class, 'providers']);
Route::get('/auth/keycloak/pending', [KeycloakAuthController::class, 'pending']);
Route::post('/auth/keycloak/pending/dismiss', [KeycloakAuthController::class, 'dismissPending']);

Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::patch('/auth/password', [AuthController::class, 'changePassword']);
});
