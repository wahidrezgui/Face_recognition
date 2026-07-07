<?php

use Illuminate\Support\Facades\Route;

Route::get('/ping', function () {
    return response()->json(['status' => 'ok']);
});

require __DIR__.'/api/auth.php';
require __DIR__.'/api/movements.php';
require __DIR__.'/api/lookups.php';
require __DIR__.'/api/organization.php';
require __DIR__.'/api/employees.php';
require __DIR__.'/api/users.php';
require __DIR__.'/api/reports.php';
require __DIR__.'/api/role-access.php';
