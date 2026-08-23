<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * emp_id was NOT NULL, which forced legacy's report-search audit entries
 * through a meaningless emp_id=1 sentinel (a search isn't "about" one
 * employee). Relaxing to nullable lets those entries honestly have none.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE `logs` MODIFY COLUMN `emp_id` INT UNSIGNED NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE `logs` MODIFY COLUMN `emp_id` INT UNSIGNED NOT NULL');
    }
};
