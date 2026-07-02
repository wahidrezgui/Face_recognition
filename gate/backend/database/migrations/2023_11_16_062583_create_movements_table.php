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
        Schema::create('movements', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('emp_id')->index();
            $table->foreign('emp_id')->references('id')->on('employees')->onDelete('cascade');
            $table->unsignedInteger('base_id')->index();
            $table->foreign('base_id')->references('id')->on('bases')->onDelete('cascade');
            $table->unsignedInteger('gate_id')->index();
            $table->foreign('gate_id')->references('id')->on('gates')->onDelete('cascade');
            $table->string('mvtype');
            $table->time('mvtime');
            $table->date('mvdate');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('movements');
    }
};
