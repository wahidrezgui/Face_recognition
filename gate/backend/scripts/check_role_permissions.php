<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Spatie\Permission\Models\Role;

foreach (Role::query()->where('guard_name', 'web')->orderBy('name')->get() as $role) {
    $routes = $role->permissions->pluck('name')->filter(
        fn ($p) => str_starts_with($p, 'route.')
    )->values()->all();

    echo $role->name . ' (' . count($routes) . " route perms)\n";
    echo '  ' . implode(', ', $routes) . "\n\n";
}
