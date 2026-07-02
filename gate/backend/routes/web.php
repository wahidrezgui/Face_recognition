<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\KeycloakAuthController;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Keycloak OAuth uses browser redirects and needs the web session stack.
|
*/

Route::middleware('web')->prefix('api/auth/keycloak')->group(function () {
    Route::get('/redirect', [KeycloakAuthController::class, 'redirect']);
    Route::get('/callback', [KeycloakAuthController::class, 'callback']);
});

Route::get('/{all}', function () {
    return view('welcome');
})->where('all', '.*');
