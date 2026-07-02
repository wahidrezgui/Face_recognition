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
        Schema::create('employee_cars', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('emp_id')->index();
            $table->foreign('emp_id')->references('id')->on('employees')->onDelete('cascade');
            $table->string('plate_number')->unique();
            $table->integer('active')->default(1);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_cars');
    }
};
