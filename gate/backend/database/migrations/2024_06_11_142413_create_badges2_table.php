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
        Schema::create('badges2', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('dep_id')->index();
            $table->foreign('dep_id')->references('id')->on('departments')->onDelete('cascade');
            $table->text('content');
            $table->integer('width');
            $table->integer('heigth');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('badges2');
    }
};
