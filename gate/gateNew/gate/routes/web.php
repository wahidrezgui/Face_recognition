<?php

use App\Http\Controllers\Inertia\DashboardController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/', DashboardController::class)->middleware('auth')->name('home');

Route::post('locale', function (Request $request) {
    $locale = $request->validate([
        'locale' => 'required|string|in:en,ar',
    ])['locale'];

    $request->session()->put('locale', $locale);

    return back();
})->name('locale.update');

require __DIR__.'/auth.php';
require __DIR__.'/app.php';
