<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('badge_log', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('emp_id')->index();
            $table->foreign('emp_id')->references('id')->on('employees')->onDelete('cascade');
            $table->date('badge_expiry_date')->nullable();
            $table->timestamp('date_printed');
            $table->unsignedInteger('created_by')->nullable()->index();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('badge_log');
    }
};
