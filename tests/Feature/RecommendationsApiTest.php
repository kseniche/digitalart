<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RecommendationsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_recommendations_exclude_non_approved_posts(): void
    {
        $user = User::factory()->create();

        Post::factory()->create([
            'user_id' => $user->id,
            'moderation_status' => 'pending',
            'is_draft' => false,
            'published_at' => null,
            'like_count' => 100,
        ]);

        $approved = Post::factory()->create([
            'user_id' => $user->id,
            'moderation_status' => 'approved',
            'is_draft' => false,
            'published_at' => null,
            'like_count' => 1,
        ]);

        $response = $this->getJson('/api/recommendations');

        $response->assertOk();
        $ids = collect($response->json())->pluck('id')->filter()->values()->all();

        $this->assertContains($approved->id, $ids);
        $this->assertCount(1, $ids);
    }
}
