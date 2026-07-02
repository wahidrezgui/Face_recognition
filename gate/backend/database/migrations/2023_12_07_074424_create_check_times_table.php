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
        Schema::create('check_times', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('dep_id')->index();
            $table->foreign('dep_id')->references('id')->on('departments')->onDelete('cascade');
            $table->unsignedInteger('gender_id')->index();
            $table->foreign('gender_id')->references('id')->on('genders')->onDelete('cascade');
            $table->unsignedInteger('rank_id')->index();
            $table->foreign('rank_id')->references('id')->on('ranks_categories')->onDelete('cascade');
            $table->time('start_time');
            $table->time('end_time');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('check_times');
    }
};
