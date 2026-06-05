<?php

namespace Tests\Feature;

use App\Models\Comment;
use App\Models\CommentReport;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CommentModerationApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::create(['name' => 'admin']);
        Role::create(['name' => 'user']);
    }

    private function approvedComment(Post $post, User $author): Comment
    {
        return Comment::factory()->create([
            'user_id' => $author->id,
            'post_id' => $post->id,
            'moderation_status' => 'approved',
            'approved_at' => now(),
            'auto_moderation_passed' => true,
            'is_hidden' => false,
        ]);
    }

    public function test_user_can_report_comment_once(): void
    {
        $author = User::factory()->create();
        $reporter = User::factory()->create();
        $post = Post::factory()->create([
            'user_id' => $author->id,
            'moderation_status' => 'approved',
            'is_draft' => false,
            'published_at' => now()->subMinute(),
        ]);
        $comment = $this->approvedComment($post, $author);
        $token = $reporter->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/comments/{$comment->id}/report", [
                'reason' => 'spam',
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('comment_reports', [
            'comment_id' => $comment->id,
            'user_id' => $reporter->id,
            'reason' => 'spam',
        ]);

        $duplicate = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/comments/{$comment->id}/report", [
                'reason' => 'insult',
            ]);

        $duplicate->assertStatus(422);
    }

    public function test_user_cannot_report_own_comment(): void
    {
        $author = User::factory()->create();
        $post = Post::factory()->create([
            'user_id' => $author->id,
            'moderation_status' => 'approved',
            'is_draft' => false,
            'published_at' => now()->subMinute(),
        ]);
        $comment = $this->approvedComment($post, $author);
        $token = $author->createToken('test')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/comments/{$comment->id}/report", [
                'reason' => 'spam',
            ])
            ->assertStatus(403)
            ->assertJson(['message' => 'Нельзя пожаловаться на свой комментарий']);

        $this->assertDatabaseMissing('comment_reports', [
            'comment_id' => $comment->id,
            'user_id' => $author->id,
        ]);
    }

    public function test_five_distinct_reports_auto_hide_comment(): void
    {
        config()->set('comment_moderation.auto_hide_reports_count', 5);

        $author = User::factory()->create();
        $post = Post::factory()->create([
            'user_id' => $author->id,
            'moderation_status' => 'approved',
            'is_draft' => false,
            'published_at' => now()->subMinute(),
            'comment_count' => 1,
        ]);
        $comment = $this->approvedComment($post, $author);

        for ($i = 0; $i < 5; $i++) {
            $reporter = User::factory()->create();
            CommentReport::create([
                'comment_id' => $comment->id,
                'user_id' => $reporter->id,
                'reason' => 'spam',
            ]);
        }

        app(\App\Services\CommentModerationService::class)->applyReportAndMaybeHide($comment->fresh());

        $comment->refresh();
        $this->assertTrue($comment->is_hidden);
    }

    public function test_admin_confirm_marks_comment_reviewed(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $token = $admin->createToken('test')->plainTextToken;

        $author = User::factory()->create();
        $post = Post::factory()->create(['user_id' => $author->id]);
        $comment = $this->approvedComment($post, $author);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/admin/comments/{$comment->id}/confirm");

        $response->assertStatus(200);
        $comment->refresh();
        $this->assertNotNull($comment->admin_reviewed_at);
    }

    public function test_recent_tab_excludes_reviewed_comments(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $token = $admin->createToken('test')->plainTextToken;

        $author = User::factory()->create();
        $post = Post::factory()->create(['user_id' => $author->id]);

        $pending = $this->approvedComment($post, $author);
        $reviewed = $this->approvedComment($post, $author);
        $reviewed->update(['admin_reviewed_at' => now()]);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/admin/comments?tab=recent');

        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($pending->id, $ids);
        $this->assertNotContains($reviewed->id, $ids);
    }

    public function test_auto_review_stale_command_marks_old_comments_without_reports(): void
    {
        config()->set('comment_moderation.auto_review_days', 7);

        $author = User::factory()->create();
        $post = Post::factory()->create(['user_id' => $author->id]);
        $comment = $this->approvedComment($post, $author);
        $comment->update(['created_at' => now()->subDays(8)]);

        $this->artisan('comments:auto-review-stale')->assertSuccessful();

        $comment->refresh();
        $this->assertNotNull($comment->admin_reviewed_at);
    }

    public function test_admin_can_dismiss_all_reports(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $token = $admin->createToken('test')->plainTextToken;

        $author = User::factory()->create();
        $reporter = User::factory()->create();
        $post = Post::factory()->create(['user_id' => $author->id]);
        $comment = $this->approvedComment($post, $author);
        $comment->update(['is_hidden' => true, 'hidden_at' => now()]);

        CommentReport::create([
            'comment_id' => $comment->id,
            'user_id' => $reporter->id,
            'reason' => 'spam',
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/admin/comments/{$comment->id}/dismiss-reports");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('comment_reports', ['comment_id' => $comment->id]);
        $comment->refresh();
        $this->assertFalse($comment->is_hidden);
    }

    public function test_admin_comment_stats_endpoint(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $token = $admin->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/admin/comments/stats');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'pending_review',
                'expiring_soon',
                'reports',
                'hidden',
                'total',
                'deleted_last_30_days',
                'pending_permanent_delete',
            ]);
    }

    public function test_admin_soft_deletes_comment_and_can_restore_within_grace(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $token = $admin->createToken('test')->plainTextToken;

        $author = User::factory()->create();
        $post = Post::factory()->create([
            'user_id' => $author->id,
            'moderation_status' => 'approved',
            'is_draft' => false,
            'published_at' => now()->subMinute(),
            'comment_count' => 1,
        ]);
        $comment = $this->approvedComment($post, $author);

        $delete = $this->withHeader('Authorization', 'Bearer '.$token)
            ->deleteJson("/api/admin/comments/{$comment->id}");

        $delete->assertStatus(200);
        $this->assertSoftDeleted('comments', ['id' => $comment->id]);
        $post->refresh();
        $this->assertSame(0, (int) $post->comment_count);

        $restore = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/admin/comments/{$comment->id}/restore");

        $restore->assertStatus(200);
        $comment->refresh();
        $this->assertNull($comment->deleted_at);
        $post->refresh();
        $this->assertSame(1, (int) $post->comment_count);
    }

    public function test_admin_comments_sort_asc(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $token = $admin->createToken('test')->plainTextToken;

        $author = User::factory()->create();
        $post = Post::factory()->create(['user_id' => $author->id]);

        $older = $this->approvedComment($post, $author);
        $older->update(['created_at' => now()->subDays(2)]);
        $newer = $this->approvedComment($post, $author);
        $newer->update(['admin_reviewed_at' => now()]);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/admin/comments?tab=all&status=deleted&sort_dir=asc');

        $response->assertStatus(200);
    }

    public function test_content_purge_removes_old_trashed_comment(): void
    {
        config()->set('content_retention.grace_days', 7);

        $author = User::factory()->create();
        $post = Post::factory()->create(['user_id' => $author->id, 'comment_count' => 0]);
        $comment = $this->approvedComment($post, $author);
        $comment->delete();
        $comment->update(['deleted_at' => now()->subDays(8)]);

        $this->artisan('content:purge-trashed')->assertSuccessful();

        $this->assertDatabaseMissing('comments', ['id' => $comment->id]);
    }
}
