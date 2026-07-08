<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Remove duplicate movement rows (keep lowest id), then enforce uniqueness
     * on the business key (emp_id, mvtype, mvdate, mvtime).
     *
     * Dedupe is irreversible — down() only drops the unique index.
     */
    public function up(): void
    {
        DB::statement('
            DELETE m1 FROM movements m1
            INNER JOIN movements m2
              ON m1.emp_id = m2.emp_id
             AND m1.mvtype = m2.mvtype
             AND m1.mvdate = m2.mvdate
             AND m1.mvtime = m2.mvtime
             AND m1.id > m2.id
        ');

        Schema::table('movements', function (Blueprint $table) {
            $table->unique(
                ['emp_id', 'mvtype', 'mvdate', 'mvtime'],
                'movements_emp_mvtype_datetime_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::table('movements', function (Blueprint $table) {
            $table->dropUnique('movements_emp_mvtype_datetime_unique');
        });
    }
};
