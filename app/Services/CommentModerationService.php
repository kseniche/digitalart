<?php

namespace App\Services;

use App\Models\BannedWord;
use App\Models\Comment;
use App\Models\CommentReport;
use App\Models\Post;
use Illuminate\Support\Facades\DB;

class CommentModerationService
{
    public function autoReviewStaleComments(): int
    {
        $days = (int) config('comment_moderation.auto_review_days', 7);

        return Comment::query()
            ->where('moderation_status', 'approved')
            ->whereNull('deleted_at')
            ->where('is_hidden', false)
            ->whereNull('admin_reviewed_at')
            ->where('created_at', '<=', now()->subDays($days))
            ->whereDoesntHave('reports')
            ->update(['admin_reviewed_at' => now()]);
    }

    public function applyReportAndMaybeHide(Comment $comment): void
    {
        $threshold = (int) config('comment_moderation.auto_hide_reports_count', 5);
        $distinctReporters = $comment->reports()->distinct('user_id')->count('user_id');

        if ($distinctReporters >= $threshold && ! $comment->is_hidden) {
            $comment->update([
                'is_hidden' => true,
                'hidden_at' => now(),
            ]);
        }
    }

    public function hideComment(Comment $comment): void
    {
        if (! $comment->is_hidden) {
            $comment->update([
                'is_hidden' => true,
                'hidden_at' => now(),
            ]);
        }
    }

    public function unhideComment(Comment $comment): void
    {
        $comment->update([
            'is_hidden' => false,
            'hidden_at' => null,
        ]);
    }

    /**
     * Снять все жалобы с комментария (необоснованные жалобы).
     */
    public function dismissAllReports(Comment $comment): void
    {
        DB::transaction(function () use ($comment) {
            $comment->reports()->delete();

            if ($comment->is_hidden && $comment->deleted_at === null) {
                $comment->update([
                    'is_hidden' => false,
                    'hidden_at' => null,
                ]);
            }
        });
    }

    public function confirmReview(Comment $comment): void
    {
        $comment->update(['admin_reviewed_at' => now()]);
    }

    /**
     * Окончательное удаление комментария (без восстановления).
     */
    public function forceDeleteComment(Comment $comment): void
    {
        DB::transaction(function () use ($comment) {
            $post = $comment->post;
            $wasVisible = $comment->moderation_status === 'approved'
                && $comment->deleted_at === null
                && ! $comment->is_hidden;

            $comment->reports()->delete();
            $comment->likes()->detach();
            $comment->forceDelete();

            if ($wasVisible && $post && $post->comment_count > 0) {
                $post->decrement('comment_count');
            }
        });
    }

    /**
     * @param  list<string>  $words
     */
    public function addBannedWords(array $words): void
    {
        foreach ($words as $word) {
            $word = trim($word);
            if ($word === '') {
                continue;
            }
            BannedWord::query()->firstOrCreate(['word' => mb_strtolower($word)]);
        }
    }

    public function decrementPostCountIfVisible(Comment $comment): void
    {
        $post = $comment->post;
        if (
            $comment->moderation_status === 'approved'
            && $comment->deleted_at === null
            && ! $comment->is_hidden
            && $post
            && $post->comment_count > 0
        ) {
            $post->decrement('comment_count');
        }
    }
}
