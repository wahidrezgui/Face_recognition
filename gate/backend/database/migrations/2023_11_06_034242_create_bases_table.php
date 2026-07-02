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
        Schema::create('bases', function (Blueprint $table) {
            $table->increments('id');
            $table->string('name_en');
            $table->string('name_ar');
            $table->string('base_photo');
            $table->timestamps();
        });

        Schema::create('gates', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('base_id')->index();
            $table->string('name_en');
            $table->string('name_ar');
            $table->foreign('base_id')->references('id')->on('bases')->onDelete('cascade');
            $table->timestamps();
        });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bases');
        Schema::dropIfExists('gates');
    }
};
