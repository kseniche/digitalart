<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            $table->string('post_title', 255);
            $table->text('post_content')->nullable();
            $table->string('media_path', 500)->nullable();
            $table->string('tags', 255)->nullable();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('category_id')->nullable()->constrained('categories')->restrictOnDelete();
            $table->enum('media_type', ['image', 'video'])->default('image');
            $table->unsignedBigInteger('like_count')->default(0);
            $table->unsignedBigInteger('comment_count')->default(0);
            $table->unsignedBigInteger('view_count')->default(0);
            $table->boolean('is_draft')->default(false);
            $table->dateTime('published_at')->nullable();
            $table->enum('moderation_status', ['pending', 'approved', 'rejected'])->default('approved');
            $table->timestamp('approved_at')->nullable();
            $table->text('moderation_rejection_reason')->nullable();
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
        Schema::dropIfExists('posts');
    }
};