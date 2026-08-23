<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('badge_log', function (Blueprint $table) {
            $table->unsignedInteger('base_id')->nullable()->after('emp_id')->index();
            $table->foreign('base_id')->references('id')->on('bases')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('badge_log', function (Blueprint $table) {
            $table->dropForeign(['base_id']);
            $table->dropColumn('base_id');
        });
    }
};
