<?php

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

foreach (['logs', 'logs_checkinout_backup'] as $t) {
    if (!Schema::hasTable($t)) continue;
    $c = DB::table($t)->whereIn('task', ['Check-In','Check-Out'])->count();
    echo "$t movement logs: $c\n";
}

$src = DB::table('logs')->whereIn('task', ['Check-In','Check-Out'])->count() > 0 ? 'logs' : 'logs_checkinout_backup';
echo "source: $src\n\n";

$joins = [
    'emp_id + created_at + task' => "l.emp_id=m.emp_id AND l.created_at=m.created_at AND l.task=m.mvtype",
    'emp_id + created_at only' => "l.emp_id=m.emp_id AND l.created_at=m.created_at",
    'emp_id + task + TIMESTAMP(mvdate,mvtime)' => "l.emp_id=m.emp_id AND l.task=m.mvtype AND l.created_at=TIMESTAMP(m.mvdate,m.mvtime)",
];

foreach ($joins as $label => $on) {
    $c = DB::selectOne("
        SELECT COUNT(DISTINCT m.id) c FROM movements m
        INNER JOIN {$src} l ON {$on}
        WHERE m.created_byname IS NULL
    ")->c;
    echo "$label => $c\n";
}
