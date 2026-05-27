<?php

namespace Tests\Feature;

use App\Models\Like;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SocialActionsVisibilityTest extends TestCase
{
    use RefreshDatabase;

    /** TC-03: лайк публикации авторизованным пользователем (toggle). POST /api/posts/{post}/like */
    public function test_user_can_toggle_like_on_public_post(): void
    {
        $author = User::factory()->create();
        $liker = User::factory()->create();
        $post = Post::factory()->create([
            'user_id' => $author->id,
            'moderation_status' => 'approved',
            'is_draft' => false,
            'published_at' => null,
            'like_count' => 0,
        ]);

        $token = $liker->createToken('test')->plainTextToken;
        $headers = ['Authorization' => 'Bearer '.$token];

        $likeResponse = $this->withHeaders($headers)
            ->postJson("/api/posts/{$post->id}/like");

        $likeResponse->assertOk()
            ->assertJson([
                'liked' => true,
                'like_count' => 1,
            ]);
        $this->assertDatabaseHas('likes', [
            'user_id' => $liker->id,
            'post_id' => $post->id,
            'deleted_at' => null,
        ]);

        $unlikeResponse = $this->withHeaders($headers)
            ->postJson("/api/posts/{$post->id}/like");

        $unlikeResponse->assertOk()
            ->assertJson([
                'liked' => false,
                'like_count' => 0,
            ]);
        $this->assertSoftDeleted('likes', [
            'user_id' => $liker->id,
            'post_id' => $post->id,
        ]);
    }

    public function test_cannot_add_like_on_non_public_post(): void
    {
        $author = User::factory()->create();
        $liker = User::factory()->create();
        $post = Post::factory()->create([
            'user_id' => $author->id,
            'moderation_status' => 'pending',
            'is_draft' => false,
            'published_at' => null,
            'like_count' => 0,
        ]);

        $token = $liker->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/posts/{$post->id}/like");

        $response->assertStatus(404);
        $this->assertEquals(0, Like::where('post_id', $post->id)->count());
    }

    public function test_can_remove_like_on_non_public_post(): void
    {
        $author = User::factory()->create();
        $liker = User::factory()->create();
        $post = Post::factory()->create([
            'user_id' => $author->id,
            'moderation_status' => 'approved',
            'is_draft' => false,
            'published_at' => null,
            'like_count' => 1,
        ]);
        Like::create(['user_id' => $liker->id, 'post_id' => $post->id]);

        $post->update(['moderation_status' => 'pending']);

        $token = $liker->createToken('test')->plainTextToken;
        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/posts/{$post->id}/like");

        $response->assertOk();
        $response->assertJson(['liked' => false]);
        $post->refresh();
        $this->assertSame(0, (int) $post->like_count);
    }

    public function test_cannot_add_favorite_on_non_public_post(): void
    {
        $author = User::factory()->create();
        $user = User::factory()->create();
        $post = Post::factory()->create([
            'user_id' => $author->id,
            'moderation_status' => 'rejected',
            'is_draft' => false,
            'published_at' => null,
        ]);

        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/posts/{$post->id}/favorite");

        $response->assertStatus(404);
        $this->assertFalse($user->fresh()->favorites()->where('post_id', $post->id)->exists());
    }

    public function test_cannot_add_comment_on_non_public_post(): void
    {
        $author = User::factory()->create();
        $user = User::factory()->create();
        $post = Post::factory()->create([
            'user_id' => $author->id,
            'moderation_status' => 'pending',
            'is_draft' => false,
            'published_at' => null,
        ]);

        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/posts/{$post->id}/comments", [
                'content' => 'Тестовый комментарий',
            ]);

        $response->assertStatus(404);
        $this->assertDatabaseMissing('comments', [
            'post_id' => $post->id,
            'user_id' => $user->id,
        ]);
    }
}
