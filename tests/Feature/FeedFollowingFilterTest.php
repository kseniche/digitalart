<?php

namespace Tests\Feature;

use App\Models\Follower;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FeedFollowingFilterTest extends TestCase
{
    use RefreshDatabase;

    private function publicPost(User $author, array $attrs = []): Post
    {
        return Post::factory()->create(array_merge([
            'user_id' => $author->id,
            'moderation_status' => 'approved',
            'is_draft' => false,
            'published_at' => now()->subHour(),
        ], $attrs));
    }

    public function test_following_filter_requires_authentication(): void
    {
        $response = $this->getJson('/api/feed?following=true');

        $response->assertStatus(401);
    }

    public function test_following_filter_returns_only_subscribed_authors_posts(): void
    {
        $viewer = User::factory()->create();
        $followed = User::factory()->create();
        $other = User::factory()->create();

        Follower::create([
            'follower_id' => $viewer->id,
            'following_id' => $followed->id,
        ]);

        $followedPost = $this->publicPost($followed, ['post_title' => 'From followed']);
        $this->publicPost($other, ['post_title' => 'From other']);

        $token = $viewer->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/feed?following=true');

        $response->assertOk()
            ->assertJsonPath('following_filter', true)
            ->assertJsonPath('following_subscriptions_count', 1);

        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($followedPost->id, $ids);
        $this->assertCount(1, $ids);
    }

    public function test_following_filter_works_with_category_filter(): void
    {
        $viewer = User::factory()->create();
        $author = User::factory()->create();

        Follower::create([
            'follower_id' => $viewer->id,
            'following_id' => $author->id,
        ]);

        $categoryA = \App\Models\Category::create(['name' => 'Cat A']);
        $categoryB = \App\Models\Category::create(['name' => 'Cat B']);

        $match = $this->publicPost($author, ['category_id' => $categoryA->id]);
        $this->publicPost($author, ['category_id' => $categoryB->id]);

        $token = $viewer->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/feed?following=true&category_id='.$categoryA->id);

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertSame([$match->id], $ids);
    }

    public function test_following_filter_empty_subscriptions_meta(): void
    {
        $viewer = User::factory()->create();
        $token = $viewer->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/feed?following=true');

        $response->assertOk()
            ->assertJsonPath('following_subscriptions_count', 0)
            ->assertJsonCount(0, 'data');
    }

    public function test_feed_without_following_returns_all_public_posts(): void
    {
        $viewer = User::factory()->create();
        $author = User::factory()->create();

        $this->publicPost($author);
        $this->publicPost(User::factory()->create());

        $token = $viewer->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/feed');

        $response->assertOk();
        $this->assertGreaterThanOrEqual(2, count($response->json('data')));
        $this->assertArrayNotHasKey('following_filter', $response->json());
    }
}
