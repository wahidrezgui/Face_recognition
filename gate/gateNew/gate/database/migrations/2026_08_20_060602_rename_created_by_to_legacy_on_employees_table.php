<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * employees.created_by (the raw name string) is superseded by created_by_id (FK -> users.id).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('employees', 'created_by')) {
            Schema::table('employees', function (Blueprint $table) {
                $table->dropColumn('created_by');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasColumn('employees', 'created_by')) {
            Schema::table('employees', function (Blueprint $table) {
                $table->string('created_by')->nullable();
            });
        }
    }
};
