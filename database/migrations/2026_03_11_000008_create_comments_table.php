<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('comments', function (Blueprint $table) {
            $table->id();
            $table->text('comment_content');
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('post_id')->constrained('posts')->cascadeOnDelete();
            $table->enum('moderation_status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->timestamp('approved_at')->nullable();
            $table->boolean('auto_moderation_passed')->nullable();
            $table->text('auto_moderation_reason')->nullable();
            $table->timestamp('auto_moderation_checked_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index('moderation_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comments');
    }
};