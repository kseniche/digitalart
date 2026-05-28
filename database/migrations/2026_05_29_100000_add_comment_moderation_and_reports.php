<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('comments', function (Blueprint $table) {
            $table->timestamp('admin_reviewed_at')->nullable()->after('approved_at');
            $table->boolean('is_hidden')->default(false)->after('admin_reviewed_at');
            $table->timestamp('hidden_at')->nullable()->after('is_hidden');
        });

        Schema::create('comment_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('comment_id')->constrained('comments')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('reason', 64);
            $table->text('other_text')->nullable();
            $table->timestamps();

            $table->unique(['comment_id', 'user_id']);
            $table->index('comment_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comment_reports');

        Schema::table('comments', function (Blueprint $table) {
            $table->dropColumn(['admin_reviewed_at', 'is_hidden', 'hidden_at']);
        });
    }
};
