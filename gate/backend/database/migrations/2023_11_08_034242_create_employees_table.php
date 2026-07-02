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
        Schema::create('nationalities', function (Blueprint $table) {
            $table->increments('id');
            $table->string('name_en');
            $table->string('name_ar')->nullable();
            $table->timestamps();
        });

        Schema::create('employees', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('status')->default(0);
            $table->string('photo')->nullable();
            $table->string('qrcode')->unique();
            $table->integer('gender_id');
            $table->integer('military_number')->nullable();
            $table->integer('phone_number')->nullable();
            $table->string('fullname_en');
            $table->string('fullname_ar')->nullable();
            $table->string('remarks')->nullable();
            $table->string('bloodtype')->nullable();
            $table->string('device')->nullable(); 
            $table->string('Job_Arabic')->nullable();
            $table->string('Job_En')->nullable();
            $table->time('StartTime')->nullable();
            $table->time('EndTime')->nullable();
            $table->string('Escort')->nullable();
            $table->unsignedInteger('dep_id')->index();
            $table->unsignedInteger('rank_id')->index();
            $table->unsignedInteger('nationality_id')->index();
            $table->integer('is_employee')->default(0);
            $table->string('qid')->nullable();
            $table->foreign('dep_id')->references('id')->on('departments')->onDelete('cascade');
            $table->foreign('rank_id')->references('id')->on('ranks')->onDelete('cascade');
            $table->foreign('nationality_id')->references('id')->on('nationalities')->onDelete('cascade');
            $table->unsignedInteger('dep_parent_id')->index();
            $table->foreign('dep_parent_id')->references('id')->on('departments');
            
            $table->timestamps();
        });

        Schema::create('logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('emp_id')->index();
            $table->foreign('emp_id')->references('id')->on('employees')->onDelete('cascade');
            $table->string('task');
            $table->string('created_by');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('nationalities');
        Schema::dropIfExists('employees');
        Schema::dropIfExists('logs');
    }
};
