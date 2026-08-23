<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class BackfillCreatedbyIds extends Command
{
    private const TARGETS = [
        'logs' => 'created_by_legacy',
        'employee_notes' => 'created_by_legacy',
    ];

    protected $signature = 'people:backfill-createdby-ids
                            {--table=logs,employee_notes : Comma-separated list of tables to backfill}
                            {--dry-run : Show match counts without writing}';

    protected $description = 'Best-effort match created_by_legacy full-name strings to users.id (logs, employee_notes)';

    public function handle(): int
    {
        foreach (explode(',', $this->option('table')) as $table) {
            $table = trim($table);

            if (! isset(self::TARGETS[$table])) {
                $this->warn("Skipping unknown table: {$table}");

                continue;
            }

            $this->backfillTable($table, self::TARGETS[$table]);
        }

        return self::SUCCESS;
    }

    private function backfillTable(string $table, string $legacyColumn): void
    {
        if (! Schema::hasColumn($table, 'created_by_id') || ! Schema::hasColumn($table, $legacyColumn)) {
            $this->error("{$table} is missing created_by_id/{$legacyColumn} — run migrations first.");

            return;
        }

        $uniqueUsersSql = "
            SELECT MIN(id) AS id, TRIM(CONCAT(firstname, ' ', lastname)) AS full_name
            FROM users
            GROUP BY full_name
            HAVING COUNT(*) = 1
        ";

        if ($this->option('dry-run')) {
            $matchable = (int) DB::selectOne("
                SELECT COUNT(*) AS cnt
                FROM {$table} t
                INNER JOIN ({$uniqueUsersSql}) u ON u.full_name = TRIM(t.{$legacyColumn})
                WHERE t.created_by_id IS NULL
                  AND t.{$legacyColumn} IS NOT NULL
                  AND t.{$legacyColumn} != ''
            ")->cnt;

            $this->info("{$table}: {$matchable} rows matchable by exact unique full-name.");

            return;
        }

        $updated = DB::update("
            UPDATE {$table} t
            INNER JOIN ({$uniqueUsersSql}) u ON u.full_name = TRIM(t.{$legacyColumn})
            SET t.created_by_id = u.id
            WHERE t.created_by_id IS NULL
              AND t.{$legacyColumn} IS NOT NULL
              AND t.{$legacyColumn} != ''
        ");

        $this->info("{$table}: backfilled {$updated} rows.");
    }
}
