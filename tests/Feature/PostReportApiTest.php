<?php

namespace Tests\Feature;

use App\Enums\PostReportStatus;
use App\Enums\UserNotificationType;
use App\Models\Post;
use App\Models\PostReport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PostReportApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::create(['name' => 'admin']);
        Role::create(['name' => 'user']);
    }

    private function publicPost(User $author): Post
    {
        return Post::factory()->create([
            'user_id' => $author->id,
            'moderation_status' => 'approved',
            'is_draft' => false,
            'published_at' => now()->subMinute(),
        ]);
    }

    public function test_user_can_report_post_once(): void
    {
        $author = User::factory()->create();
        $reporter = User::factory()->create();
        $post = $this->publicPost($author);
        $token = $reporter->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/posts/{$post->id}/report", ['reason' => 'spam']);

        $response->assertStatus(201);
        $this->assertDatabaseHas('post_reports', [
            'post_id' => $post->id,
            'user_id' => $reporter->id,
            'reason' => 'spam',
            'status' => PostReportStatus::Pending->value,
        ]);

        $duplicate = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/posts/{$post->id}/report", ['reason' => 'plagiarism']);

        $duplicate->assertStatus(422)
            ->assertJson(['message' => 'Вы уже отправляли жалобу на эту публикацию']);
    }

    public function test_report_submission_creates_internal_notification(): void
    {
        $author = User::factory()->create();
        $reporter = User::factory()->create();
        $post = $this->publicPost($author);
        $token = $reporter->createToken('test')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/posts/{$post->id}/report", ['reason' => 'copyright'])
            ->assertStatus(201);

        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $reporter->id,
            'type' => UserNotificationType::PostReportSubmitted->value,
            'email_sent' => false,
        ]);
    }

    public function test_user_cannot_report_own_post(): void
    {
        $author = User::factory()->create();
        $post = $this->publicPost($author);
        $token = $author->createToken('test')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/posts/{$post->id}/report", ['reason' => 'spam'])
            ->assertStatus(403);
    }

    public function test_admin_can_reject_post_report(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $author = User::factory()->create();
        $reporter = User::factory()->create(['email_notifications_enabled' => false]);
        $post = $this->publicPost($author);

        $report = PostReport::create([
            'post_id' => $post->id,
            'user_id' => $reporter->id,
            'reason' => 'spam',
        ]);

        $token = $admin->createToken('test')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/admin/post-reports/{$report->id}/reject")
            ->assertStatus(200);

        $report->refresh();
        $this->assertSame(PostReportStatus::Rejected, $report->status);
        $this->assertNotNull($report->reviewed_at);
        $this->assertSame($admin->id, (int) $report->reviewed_by);

        $notification = \App\Models\UserNotification::query()
            ->where('user_id', $reporter->id)
            ->where('type', UserNotificationType::PostReportReviewed->value)
            ->first();

        $this->assertNotNull($notification);
        $this->assertStringContainsString('отклонена', mb_strtolower($notification->body));
    }

    public function test_admin_confirm_post_report_hides_post_and_notifies_author(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $author = User::factory()->create(['email_notifications_enabled' => false]);
        $reporter = User::factory()->create(['email_notifications_enabled' => false]);
        $post = $this->publicPost($author);

        $report = PostReport::create([
            'post_id' => $post->id,
            'user_id' => $reporter->id,
            'reason' => 'spam',
        ]);

        $token = $admin->createToken('test')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/admin/post-reports/{$report->id}/confirm")
            ->assertStatus(200)
            ->assertJson(['message' => 'Жалоба подтверждена. Публикация скрыта.']);

        $post->refresh();
        $report->refresh();

        $this->assertSame('rejected', $post->moderation_status);
        $this->assertNull($post->approved_at);
        $this->assertSame(PostReportStatus::Confirmed, $report->status);

        $authorNotification = \App\Models\UserNotification::query()
            ->where('user_id', $author->id)
            ->where('type', UserNotificationType::PostHiddenByReport->value)
            ->first();

        $this->assertNotNull($authorNotification);
        $this->assertStringContainsString(
            'скрыта по результатам рассмотрения жалобы',
            mb_strtolower($authorNotification->body)
        );
        $this->assertStringContainsString($post->post_title, $authorNotification->body);

        $reporterNotification = \App\Models\UserNotification::query()
            ->where('user_id', $reporter->id)
            ->where('type', UserNotificationType::PostReportReviewed->value)
            ->first();

        $this->assertNotNull($reporterNotification);
    }

    public function test_reject_post_report_does_not_change_post(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $author = User::factory()->create();
        $reporter = User::factory()->create(['email_notifications_enabled' => false]);
        $post = $this->publicPost($author);

        $report = PostReport::create([
            'post_id' => $post->id,
            'user_id' => $reporter->id,
            'reason' => 'spam',
        ]);

        $token = $admin->createToken('test')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/admin/post-reports/{$report->id}/reject")
            ->assertStatus(200);

        $post->refresh();
        $this->assertSame('approved', $post->moderation_status);
    }

    public function test_author_cannot_resubmit_post_hidden_by_confirmed_report(): void
    {
        $author = User::factory()->create();
        $reporter = User::factory()->create();
        $post = $this->publicPost($author);

        PostReport::create([
            'post_id' => $post->id,
            'user_id' => $reporter->id,
            'reason' => 'spam',
            'status' => PostReportStatus::Confirmed,
            'reviewed_at' => now(),
        ]);

        $post->update([
            'moderation_status' => 'rejected',
            'approved_at' => null,
            'moderation_rejection_reason' => 'Скрыто по результатам рассмотрения жалобы пользователей.',
        ]);

        $token = $author->createToken('test')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson("/api/posts/{$post->id}", [
                'title' => 'Новое название',
                'is_draft' => false,
            ])
            ->assertStatus(403)
            ->assertJsonFragment([
                'message' => 'Публикация скрыта по результатам рассмотрения жалобы и не может быть изменена или отправлена повторно.',
            ]);
    }

    public function test_confirm_closes_all_pending_reports_on_same_post(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $author = User::factory()->create(['email_notifications_enabled' => false]);
        $reporter1 = User::factory()->create(['email_notifications_enabled' => false]);
        $reporter2 = User::factory()->create(['email_notifications_enabled' => false]);
        $post = $this->publicPost($author);

        $report1 = PostReport::create([
            'post_id' => $post->id,
            'user_id' => $reporter1->id,
            'reason' => 'spam',
        ]);
        $report2 = PostReport::create([
            'post_id' => $post->id,
            'user_id' => $reporter2->id,
            'reason' => 'offensive',
        ]);

        $token = $admin->createToken('test')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/admin/post-reports/{$report1->id}/confirm")
            ->assertStatus(200);

        $this->assertSame(PostReportStatus::Confirmed, $report1->fresh()->status);
        $this->assertSame(PostReportStatus::Confirmed, $report2->fresh()->status);
    }
}
