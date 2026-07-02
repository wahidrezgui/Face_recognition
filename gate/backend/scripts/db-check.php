<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$db = DB::connection()->getDatabaseName();
echo "CONNECTED: {$db}\n";
echo "Host: " . config('database.connections.mysql.host') . "\n\n";

$key = 'Tables_in_' . $db;
$tables = DB::select('SHOW TABLES');
$withData = [];
$empty = [];

foreach ($tables as $row) {
    $t = $row->$key;
    try {
        $c = DB::table($t)->count();
        if ($c > 0) {
            $withData[$t] = $c;
        } else {
            $empty[] = $t;
        }
    } catch (Throwable $e) {
        $empty[] = $t . ' (view/error)';
    }
}

echo "Tables with data (" . count($withData) . "):\n";
foreach ($withData as $t => $c) {
    echo "  {$t}: {$c}\n";
}

echo "\nEmpty tables: " . count($empty) . " / " . count($tables) . " total\n";

$migrations = DB::table('migrations')->count();
echo "\nMigrations recorded: {$migrations}\n";
