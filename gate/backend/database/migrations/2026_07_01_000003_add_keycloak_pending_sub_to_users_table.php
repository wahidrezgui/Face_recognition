<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('users', 'keycloak_pending_sub')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->string('keycloak_pending_sub', 64)->nullable()->after('keycloak_sub');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('users', 'keycloak_pending_sub')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('keycloak_pending_sub');
        });
    }
};
