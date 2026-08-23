<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;

$username = $argv[1] ?? null;
if (! $username) {
    echo "Usage: php scripts/check_user_permissions.php <username>\n";
    exit(1);
}

$user = User::where('username', $username)->first();
if (! $user) {
    echo "User not found: {$username}\n";
    exit(1);
}

$user->load('roles');
echo "User: {$user->username} (id {$user->id})\n";
echo 'Roles: ' . $user->roles->pluck('name')->implode(', ') . "\n";

$payload = $user->withAuthPayload();
$permissions = $payload->permissions ?? [];
$routes = array_values(array_filter($permissions, fn ($p) => str_starts_with($p, 'route.')));

echo 'Permission count: ' . count($permissions) . "\n";
echo 'Route permissions: ' . implode(', ', $routes) . "\n";
echo 'Has route.dashboard: ' . (in_array('route.dashboard', $permissions, true) ? 'yes' : 'no') . "\n";
