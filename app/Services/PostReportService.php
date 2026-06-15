<?php

namespace App\Services;

use App\Enums\PostReportStatus;
use App\Enums\UserNotificationType;
use App\Models\Post;
use App\Models\PostReport;
use App\Models\User;
use App\Notifications\PostReportReviewedNotification;
use App\Support\PostReportOutcomeText;
use Illuminate\Support\Facades\DB;

class PostReportService
{
    private const HIDE_REASON = 'Скрыто по результатам рассмотрения жалобы пользователей.';

    public function __construct(
        private readonly UserNotificationService $userNotifications,
    ) {}

    public function confirm(PostReport $report, User $admin): void
    {
        DB::transaction(function () use ($report, $admin) {
            $report->loadMissing(['post.author', 'reporter']);
            $post = $report->post;

            if ($post && ! $post->trashed() && ($post->moderation_status ?? '') === 'approved') {
                $post->update([
                    'moderation_status' => 'rejected',
                    'approved_at' => null,
                    'moderation_rejection_reason' => self::HIDE_REASON,
                ]);

                if ($post->author) {
                    $this->notifyPostAuthorHiddenByReport($post);
                }
            }

            $pendingReports = PostReport::query()
                ->where('post_id', $report->post_id)
                ->where('status', PostReportStatus::Pending)
                ->with(['reporter', 'post'])
                ->get();

            foreach ($pendingReports as $pendingReport) {
                $pendingReport->update([
                    'status' => PostReportStatus::Confirmed,
                    'reviewed_by' => $admin->id,
                    'reviewed_at' => now(),
                ]);
                $this->notifyReporter(
                    $pendingReport->fresh(['post', 'reporter']),
                    PostReportOutcomeText::confirmed()
                );
            }
        });
    }

    public function reject(PostReport $report, User $admin): void
    {
        $report->update([
            'status' => PostReportStatus::Rejected,
            'reviewed_by' => $admin->id,
            'reviewed_at' => now(),
        ]);

        $this->notifyReporter($report->fresh(['post', 'reporter']), PostReportOutcomeText::rejected());
    }

    public function notifyReportersOnPostMeasures(Post $post, User $admin, string $measureDescription): void
    {
        $reports = PostReport::query()
            ->where('post_id', $post->id)
            ->where('status', PostReportStatus::Pending)
            ->with(['reporter', 'post'])
            ->get();

        if ($reports->isEmpty()) {
            return;
        }

        $outcome = PostReportOutcomeText::measuresTaken($measureDescription);

        foreach ($reports as $report) {
            $report->update([
                'status' => PostReportStatus::Confirmed,
                'reviewed_by' => $admin->id,
                'reviewed_at' => now(),
            ]);
            $this->notifyReporter($report->fresh(['post', 'reporter']), $outcome);
        }
    }

    private function notifyPostAuthorHiddenByReport(Post $post): void
    {
        $author = $post->author;
        if (! $author) {
            return;
        }

        $this->userNotifications->notify(
            $author,
            UserNotificationType::PostHiddenByReport,
            [
                'title' => $post->post_title ?: 'Публикация',
                'post_id' => (string) $post->id,
                'user_id' => (string) $author->id,
            ],
            null,
            ['post_id' => $post->id]
        );
    }

    private function notifyReporter(PostReport $report, string $outcomeText): void
    {
        $reporter = $report->reporter;
        if (! $reporter) {
            return;
        }

        $post = $report->post;
        $postTitle = $post?->post_title ?? 'Публикация';
        $postId = (string) ($report->post_id ?? '');

        $mail = new PostReportReviewedNotification($post, $outcomeText);

        $this->userNotifications->notify(
            $reporter,
            UserNotificationType::PostReportReviewed,
            [
                'title' => $postTitle,
                'post_id' => $postId,
                'review_outcome' => $outcomeText,
            ],
            $mail,
            ['post_id' => $report->post_id, 'report_id' => $report->id]
        );
    }
}
