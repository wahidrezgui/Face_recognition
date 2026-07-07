<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('zones', function (Blueprint $table) {
            $table->string('pattern_type', 16)->default('none')->after('color');
            $table->string('pattern_color', 32)->nullable()->after('pattern_type');
        });
    }

    public function down(): void
    {
        Schema::table('zones', function (Blueprint $table) {
            $table->dropColumn(['pattern_type', 'pattern_color']);
        });
    }
};
