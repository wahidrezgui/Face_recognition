<?php

use App\Http\Controllers\Inertia\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Inertia\Auth\KeycloakAuthController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    Route::get('login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('login', [AuthenticatedSessionController::class, 'store']);

    Route::get('auth/keycloak/redirect', [KeycloakAuthController::class, 'redirect'])->name('keycloak.redirect');
    Route::get('auth/keycloak/callback', [KeycloakAuthController::class, 'callback'])->name('keycloak.callback');
    Route::get('auth/pending', [KeycloakAuthController::class, 'pending'])->name('auth.pending');
});

Route::middleware('auth')->group(function () {
    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');
});
