<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * employee_notes.created_by (the raw name string) is superseded by created_by_id (FK -> users.id).
 * Renamed rather than dropped so historical audit text is preserved.
 * Note: down() renames the column back but does not restore the original NOT NULL
 * constraint — any rows written after this migration may have a null value.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employee_notes', function (Blueprint $table) {
            $table->renameColumn('created_by', 'created_by_legacy');
        });

        Schema::table('employee_notes', function (Blueprint $table) {
            $table->string('created_by_legacy')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('employee_notes', function (Blueprint $table) {
            $table->renameColumn('created_by_legacy', 'created_by');
        });
    }
};
