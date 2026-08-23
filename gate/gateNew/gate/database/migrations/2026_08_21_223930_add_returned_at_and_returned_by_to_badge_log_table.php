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
            $table->timestamp('returned_at')->nullable()->after('date_printed');
            $table->unsignedInteger('returned_by')->nullable()->after('returned_at')->index();
            $table->foreign('returned_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('badge_log', function (Blueprint $table) {
            $table->dropForeign(['returned_by']);
            $table->dropColumn(['returned_at', 'returned_by']);
        });
    }
};
