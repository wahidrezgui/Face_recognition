<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('movements', function (Blueprint $table) {
            $table->index(['emp_id', 'created_at'], 'movements_emp_created_idx');
        });

        Schema::table('employees', function (Blueprint $table) {
            $table->index('qrcode', 'employees_qrcode_idx');
            $table->index('military_number', 'employees_military_number_idx');
            $table->index('dep_id', 'employees_dep_id_idx');
        });

        if (Schema::hasTable('logs')) {
            Schema::table('logs', function (Blueprint $table) {
                $table->index(['emp_id', 'created_at'], 'logs_emp_created_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::table('movements', function (Blueprint $table) {
            $table->dropIndex('movements_emp_created_idx');
        });

        Schema::table('employees', function (Blueprint $table) {
            $table->dropIndex('employees_qrcode_idx');
            $table->dropIndex('employees_military_number_idx');
            $table->dropIndex('employees_dep_id_idx');
        });

        if (Schema::hasTable('logs')) {
            Schema::table('logs', function (Blueprint $table) {
                $table->dropIndex('logs_emp_created_idx');
            });
        }
    }
};
