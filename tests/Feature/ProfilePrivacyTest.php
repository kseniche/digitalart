<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfilePrivacyTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_profile_does_not_expose_email_for_guest(): void
    {
        $user = User::factory()->create([
            'email' => 'private@example.com',
        ]);

        $response = $this->getJson("/api/profiles/{$user->id}");

        $response->assertOk();
        $response->assertJsonMissingPath('email');
    }

    public function test_profile_update_normalizes_phone_and_website(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson('/api/profile', [
                'phone' => '8 (900) 123-45-67',
                'website' => 'example.com',
            ]);

        $response->assertOk();
        $user->refresh();
        $this->assertSame('+79001234567', $user->phone);
        $this->assertSame('https://example.com', $user->website);
    }

    public function test_profile_update_normalizes_international_phone(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson('/api/profile', [
                'phone' => '+1 (202) 555-0123',
            ]);

        $response->assertOk();
        $user->refresh();
        $this->assertSame('+12025550123', $user->phone);
    }

    public function test_profile_update_normalizes_website_without_protocol(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson('/api/profile', [
                'website' => 'google.com',
            ]);

        $response->assertOk();
        $user->refresh();
        $this->assertSame('https://google.com', $user->website);
    }

    public function test_profile_update_keeps_existing_http_protocol(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson('/api/profile', [
                'website' => 'http://example.com',
            ]);

        $response->assertOk();
        $user->refresh();
        $this->assertSame('http://example.com', $user->website);
    }

    public function test_profile_update_rejects_invalid_phone(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson('/api/profile', [
                'phone' => '+12345',
            ]);

        $response->assertStatus(422);
    }

    public function test_current_user_profile_includes_email_for_owner(): void
    {
        $user = User::factory()->create([
            'email' => 'owner@example.com',
        ]);
        $token = $user->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/profile');

        $response->assertOk();
        $response->assertJsonPath('email', 'owner@example.com');
    }

    public function test_public_profile_hides_future_scheduled_posts(): void
    {
        $user = User::factory()->create();
        Post::factory()->create([
            'user_id' => $user->id,
            'post_title' => 'Уже опубликовано',
            'is_draft' => false,
            'moderation_status' => 'approved',
            'published_at' => now()->subHour(),
        ]);
        Post::factory()->create([
            'user_id' => $user->id,
            'post_title' => 'Будущая публикация',
            'is_draft' => false,
            'moderation_status' => 'approved',
            'published_at' => now()->addHour(),
        ]);

        $response = $this->getJson("/api/profiles/{$user->id}");

        $response->assertOk();
        $titles = collect($response->json('posts'))->pluck('post_title')->all();
        $this->assertContains('Уже опубликовано', $titles);
        $this->assertNotContains('Будущая публикация', $titles);
    }

    public function test_public_profile_posts_endpoint_hides_future_scheduled_posts(): void
    {
        $user = User::factory()->create();
        Post::factory()->create([
            'user_id' => $user->id,
            'post_title' => 'Виден в списке',
            'is_draft' => false,
            'moderation_status' => 'approved',
            'published_at' => now()->subHour(),
        ]);
        Post::factory()->create([
            'user_id' => $user->id,
            'post_title' => 'Скрыт до времени',
            'is_draft' => false,
            'moderation_status' => 'approved',
            'published_at' => now()->addHour(),
        ]);

        $response = $this->getJson("/api/profiles/{$user->id}/posts");

        $response->assertOk();
        $titles = collect($response->json('data'))->pluck('post_title')->all();
        $this->assertContains('Виден в списке', $titles);
        $this->assertNotContains('Скрыт до времени', $titles);
    }
}
