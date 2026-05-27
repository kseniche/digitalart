<?php

namespace Tests\Feature;

use App\Models\Comment;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CommentApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_comment_passing_auto_moderation_is_published_immediately(): void
    {
        config()->set('auto_moderation.default_banned_words', ['banword']);
        config()->set('auto_moderation.banned_words', []);

        $postOwner = User::factory()->create();
        $author = User::factory()->create();
        $post = Post::factory()->create([
            'user_id' => $postOwner->id,
            'comment_count' => 0,
            'moderation_status' => 'approved',
            'is_draft' => false,
            'published_at' => now()->subMinute(),
        ]);
        $token = $author->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/posts/{$post->id}/comments", [
                'content' => 'Нормальный комментарий без запрещенных слов',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('comment.auto_moderation_passed', true);

        $commentId = $response->json('comment.id');
        $this->assertNotNull($commentId);
        $this->assertDatabaseHas('comments', [
            'id' => $commentId,
            'moderation_status' => 'approved',
            'auto_moderation_passed' => 1,
            'deleted_at' => null,
        ]);
        $post->refresh();
        $this->assertSame(1, (int) $post->comment_count);
    }

    public function test_comment_failing_auto_moderation_is_soft_deleted(): void
    {
        config()->set('auto_moderation.default_banned_words', ['banword']);
        config()->set('auto_moderation.banned_words', []);

        $postOwner = User::factory()->create();
        $author = User::factory()->create();
        $post = Post::factory()->create([
            'user_id' => $postOwner->id,
            'moderation_status' => 'approved',
            'is_draft' => false,
            'published_at' => now()->subMinute(),
        ]);
        $token = $author->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/posts/{$post->id}/comments", [
                'content' => 'Комментарий с banword внутри',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('comment.auto_moderation_passed', false);

        $commentId = $response->json('comment.id');
        $this->assertNotNull($commentId);
        $this->assertSoftDeleted('comments', ['id' => $commentId]);
        $this->assertDatabaseHas('comments', [
            'id' => $commentId,
            'auto_moderation_passed' => 0,
        ]);
    }

    public function test_deleting_approved_comment_decrements_post_comment_count(): void
    {
        $author = User::factory()->create();
        $postOwner = User::factory()->create();
        $post = Post::factory()->create([
            'user_id' => $postOwner->id,
            'comment_count' => 1,
            'moderation_status' => 'approved',
            'is_draft' => false,
            'published_at' => now()->subMinute(),
        ]);
        $comment = Comment::create([
            'comment_content' => 'Одобренный комментарий',
            'user_id' => $author->id,
            'post_id' => $post->id,
            'moderation_status' => 'approved',
        ]);
        $token = $author->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->deleteJson("/api/comments/{$comment->id}");

        $response->assertStatus(200);
        $this->assertSoftDeleted('comments', ['id' => $comment->id]);
        $post->refresh();
        $this->assertSame(0, (int) $post->comment_count);
    }
}
