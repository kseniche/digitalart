<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('posts') || ! Schema::hasColumn('posts', 'tags')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        // Свежие установки и SQLite-тесты уже получают json из create_posts.
        if ($driver === 'sqlite') {
            return;
        }

        try {
            $type = Schema::getColumnType('posts', 'tags');
        } catch (\Throwable) {
            $type = null;
        }

        if ($type === 'json') {
            return;
        }

        Schema::table('posts', function (Blueprint $table) {
            $table->json('tags')->nullable()->change();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('posts') || Schema::getConnection()->getDriverName() === 'sqlite') {
            return;
        }

        Schema::table('posts', function (Blueprint $table) {
            $table->string('tags', 255)->nullable()->change();
        });
    }
};
