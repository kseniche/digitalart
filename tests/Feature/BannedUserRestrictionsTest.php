<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BannedUserRestrictionsTest extends TestCase
{
    use RefreshDatabase;

    private function authHeaderForBannedUser(): array
    {
        $user = User::factory()->create([
            'is_banned' => true,
            'ban_reason' => 'Тестовая причина блокировки',
            'password' => bcrypt('password123'),
        ]);
        $token = $user->createToken('test-token')->plainTextToken;

        return ['Authorization' => 'Bearer '.$token];
    }

    /** TC-06: заблокированный пользователь не может оставить комментарий. POST /api/posts/{post}/comments */
    public function test_banned_user_cannot_create_comment(): void
    {
        $author = User::factory()->create();
        $post = Post::factory()->create([
            'user_id' => $author->id,
            'moderation_status' => 'approved',
            'is_draft' => false,
            'published_at' => null,
        ]);

        $response = $this->withHeaders($this->authHeaderForBannedUser())
            ->postJson("/api/posts/{$post->id}/comments", [
                'content' => 'Комментарий от заблокированного пользователя',
            ]);

        $response->assertStatus(403)
            ->assertJsonFragment(['ban_reason' => 'Тестовая причина блокировки'])
            ->assertJsonPath('message', 'Ваш аккаунт заблокирован. Причина: Тестовая причина блокировки');

        $this->assertDatabaseMissing('comments', [
            'post_id' => $post->id,
            'comment_content' => 'Комментарий от заблокированного пользователя',
        ]);
    }

    public function test_banned_user_cannot_toggle_favorite(): void
    {
        $author = User::factory()->create();
        $post = Post::factory()->create([
            'user_id' => $author->id,
            'moderation_status' => 'approved',
            'is_draft' => false,
            'published_at' => null,
        ]);

        $response = $this->withHeaders($this->authHeaderForBannedUser())
            ->postJson("/api/posts/{$post->id}/favorite");

        $response->assertStatus(403)
            ->assertJsonFragment(['ban_reason' => 'Тестовая причина блокировки'])
            ->assertJsonPath('message', 'Ваш аккаунт заблокирован. Причина: Тестовая причина блокировки');
    }

    public function test_banned_user_cannot_follow_other_user(): void
    {
        $target = User::factory()->create();

        $response = $this->withHeaders($this->authHeaderForBannedUser())
            ->postJson("/api/users/{$target->id}/follow");

        $response->assertStatus(403)
            ->assertJsonFragment(['ban_reason' => 'Тестовая причина блокировки'])
            ->assertJsonPath('message', 'Ваш аккаунт заблокирован. Причина: Тестовая причина блокировки');
    }

    public function test_banned_user_cannot_update_password(): void
    {
        $response = $this->withHeaders($this->authHeaderForBannedUser())
            ->postJson('/api/user/update-password', [
                'current_password' => 'password123',
                'password' => 'newpassword123',
                'password_confirmation' => 'newpassword123',
            ]);

        $response->assertStatus(403)
            ->assertJsonFragment(['ban_reason' => 'Тестовая причина блокировки'])
            ->assertJsonPath('message', 'Ваш аккаунт заблокирован. Причина: Тестовая причина блокировки');
    }

    public function test_banned_user_can_logout(): void
    {
        $user = User::factory()->create([
            'is_banned' => true,
        ]);
        $token = $user->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/logout');

        $response->assertStatus(200);
    }
}
