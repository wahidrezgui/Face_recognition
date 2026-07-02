<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class BackfillMovementsCreatedby extends Command
{
    private const MOVEMENT_TASKS = ['Check-In', 'Check-Out'];

    private const BACKUP_TABLE = 'logs_checkinout_backup';

    protected $signature = 'movements:backfill-createdby
                            {--dry-run : Show how many rows would be updated}
                            {--restore-logs : Copy movement logs from backup into logs table first}
                            {--fill-ids : Also map created_byname to createdby_id via users table}';

    protected $description = 'Copy logs.created_by into movements.created_byname (emp_id + created_at match)';

    public function handle(): int
    {
        if (! Schema::hasColumn('movements', 'created_byname')) {
            $this->error('Column movements.created_byname does not exist. Run migrations first.');

            return self::FAILURE;
        }

        if ($this->option('restore-logs')) {
            $this->restoreLogsFromBackup();
        }

        $logTable = $this->resolveLogTable();
        $this->info("Copying from: {$logTable}.created_by → movements.created_byname");
        $this->info('Join: logs.emp_id = movements.emp_id AND logs.created_at = movements.created_at');

        if ($this->option('dry-run')) {
            return $this->runDryRun($logTable);
        }

        $updated = $this->copyCreatedByFromLogs($logTable);
        $this->info("Updated {$updated} movement rows.");

        if ($this->option('fill-ids')) {
            $this->fillCreatedbyIdFromName();
        }

        $this->printSummary();

        return self::SUCCESS;
    }

    private function restoreLogsFromBackup(): void
    {
        if (! Schema::hasTable(self::BACKUP_TABLE)) {
            $this->error('Backup table '.self::BACKUP_TABLE.' not found.');

            return;
        }

        $existing = (int) DB::table('logs')->whereIn('task', self::MOVEMENT_TASKS)->count();
        if ($existing > 0) {
            $this->warn("logs already has {$existing} Check-In/Check-Out rows — skipping restore.");

            return;
        }

        $this->info('Restoring Check-In/Check-Out rows from backup into logs...');

        DB::statement("
            INSERT INTO logs (id, emp_id, task, created_by, created_at, updated_at)
            SELECT id, emp_id, task, created_by, created_at, updated_at
            FROM ".self::BACKUP_TABLE.'
        ');

        $restored = (int) DB::table('logs')->whereIn('task', self::MOVEMENT_TASKS)->count();
        $this->info("Restored {$restored} rows into logs.");
    }

    private function resolveLogTable(): string
    {
        $liveCount = (int) DB::table('logs')->whereIn('task', self::MOVEMENT_TASKS)->count();
        if ($liveCount > 0) {
            return 'logs';
        }

        if (Schema::hasTable(self::BACKUP_TABLE)) {
            return self::BACKUP_TABLE;
        }

        throw new \RuntimeException('No log data found in logs or '.self::BACKUP_TABLE);
    }

    private function runDryRun(string $logTable): int
    {
        $matchable = (int) DB::selectOne("
            SELECT COUNT(DISTINCT m.id) AS cnt
            FROM movements m
            INNER JOIN {$logTable} l
                ON l.emp_id = m.emp_id
               AND l.created_at = m.created_at
            WHERE m.created_byname IS NULL OR m.created_byname = ''
        ")->cnt;

        $totalLogs = (int) DB::table($logTable)->whereIn('task', self::MOVEMENT_TASKS)->count();
        $withName = (int) DB::table('movements')->whereNotNull('created_byname')->where('created_byname', '!=', '')->count();
        $withoutName = (int) DB::table('movements')->whereNull('created_byname')->orWhere('created_byname', '')->count();

        $this->table(['Metric', 'Count'], [
            ['Log source', $logTable],
            ['Check-In/Check-Out logs', number_format($totalLogs)],
            ['Movements already with created_byname', number_format($withName)],
            ['Movements still empty', number_format($withoutName)],
            ['Can copy from logs (emp_id + created_at)', number_format($matchable)],
        ]);

        return self::SUCCESS;
    }

    private function copyCreatedByFromLogs(string $logTable): int
    {
        return DB::update("
            UPDATE movements m
            INNER JOIN {$logTable} l
                ON l.emp_id = m.emp_id
               AND l.created_at = m.created_at
            SET m.created_byname = TRIM(l.created_by)
            WHERE m.created_byname IS NULL OR m.created_byname = ''
        ");
    }

    private function fillCreatedbyIdFromName(): void
    {
        $uniqueUsersSql = "
            SELECT MIN(id) AS id, TRIM(CONCAT(firstname, ' ', lastname)) AS full_name
            FROM users
            GROUP BY full_name
            HAVING COUNT(*) = 1
        ";

        $updated = DB::update("
            UPDATE movements m
            INNER JOIN ({$uniqueUsersSql}) u
                ON u.full_name = TRIM(m.created_byname)
            SET m.createdby_id = u.id
            WHERE m.createdby_id IS NULL
              AND m.created_byname IS NOT NULL
              AND m.created_byname != ''
        ");

        $this->info("Mapped createdby_id for {$updated} rows from created_byname.");
    }

    private function printSummary(): void
    {
        $stats = DB::selectOne('
            SELECT
                COUNT(*) AS total,
                SUM(created_byname IS NOT NULL AND created_byname != "") AS with_name,
                SUM(created_byname IS NULL OR created_byname = "") AS without_name
            FROM movements
        ');

        $this->newLine();
        $this->table(['Metric', 'Count'], [
            ['Total movements', number_format((int) $stats->total)],
            ['With created_byname (from logs)', number_format((int) $stats->with_name)],
            ['Still empty', number_format((int) $stats->without_name)],
        ]);
    }
}
