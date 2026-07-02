<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('users', 'keycloak_sub')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->string('keycloak_sub', 64)->nullable()->unique()->after('email');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('users', 'keycloak_sub')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['keycloak_sub']);
            $table->dropColumn('keycloak_sub');
        });
    }
};
