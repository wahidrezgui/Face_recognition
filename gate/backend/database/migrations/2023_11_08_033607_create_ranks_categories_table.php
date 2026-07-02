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
        Schema::create('ranks_categories', function (Blueprint $table) {
            $table->increments('id');
            $table->string('name_en');
            $table->string('name_ar');
            $table->integer('ordre')->default(0);
            $table->timestamps();
        });

        Schema::create('ranks', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('rank_id')->index();
            $table->string('name_en');
            $table->string('name_ar');
            $table->integer('rankvalue')->default(0);
            $table->foreign('rank_id')->references('id')->on('ranks_categories')->onDelete('cascade');
            $table->timestamps();
        });

       
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ranks_categories');
        Schema::dropIfExists('ranks');
      
    }
};
