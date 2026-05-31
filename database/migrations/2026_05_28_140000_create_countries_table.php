<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('countries', function (Blueprint $table) {
            $table->id();
            $table->string('code', 2)->unique();
            $table->string('name_ru', 128);
            $table->timestamps();
            $table->index('name_ru');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('countries');
    }
};
