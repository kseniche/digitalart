<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserNotificationType;
use App\Http\Controllers\Controller;
use App\Models\Comment;
use App\Models\CommentReport;
use App\Notifications\CommentRemovedByAdminNotification;
use App\Notifications\CommentRestoredNotification;
use App\Services\CommentModerationService;
use App\Services\UserNotificationService;
use App\Support\ContentRetention;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AdminCommentController extends Controller
{
    public function __construct(
        private readonly CommentModerationService $moderation,
        private readonly UserNotificationService $userNotifications,
    ) {}

    public function stats(): JsonResponse
    {
        $reviewDays = (int) config('comment_moderation.auto_review_days', 7);
        $graceDays = ContentRetention::graceDays();
        $expiringDays = (int) config('content_retention.comment_queue_expiring_days', 2);

        $pendingReview = Comment::query()
            ->where('moderation_status', 'approved')
            ->whereNull('deleted_at')
            ->where('is_hidden', false)
            ->whereNull('admin_reviewed_at')
            ->where('created_at', '>', now()->subDays($reviewDays))
            ->count();

        $expiringSoon = Comment::query()
            ->where('moderation_status', 'approved')
            ->whereNull('deleted_at')
            ->where('is_hidden', false)
            ->whereNull('admin_reviewed_at')
            ->where('created_at', '<=', now()->subDays($reviewDays - $expiringDays))
            ->where('created_at', '>', now()->subDays($reviewDays))
            ->count();

        $reports = Comment::query()
            ->whereNull('deleted_at')
            ->whereHas('reports')
            ->count();

        $hidden = Comment::query()
            ->whereNull('deleted_at')
            ->where('is_hidden', true)
            ->count();

        $total = Comment::withTrashed()->count();

        $deletedLast30 = Comment::onlyTrashed()
            ->where('deleted_at', '>=', now()->subDays(30))
            ->count();

        $pendingPurge = Comment::onlyTrashed()
            ->where('deleted_at', '>=', now()->subDays($graceDays))
            ->count();

        return response()->json([
            'pending_review' => $pendingReview,
            'expiring_soon' => $expiringSoon,
            'reports' => $reports,
            'hidden' => $hidden,
            'total' => $total,
            'deleted_last_30_days' => $deletedLast30,
            'pending_permanent_delete' => $pendingPurge,
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $tab = $request->input('tab', 'recent');
            $status = $request->input('status', 'all');
            $reviewDays = (int) config('comment_moderation.auto_review_days', 7);
            $graceDays = ContentRetention::graceDays();
            $expiringDays = (int) config('content_retention.comment_queue_expiring_days', 2);
            $sortDir = strtolower((string) $request->input('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';

            $query = Comment::with([
                'author' => fn ($q) => $q->withTrashed(),
                'post' => fn ($q) => $q->withTrashed(),
            ])
                ->withCount('reports')
                ->withTrashed();

            if ($tab === 'recent') {
                $query->where('moderation_status', 'approved')
                    ->whereNull('comments.deleted_at')
                    ->where('comments.is_hidden', false)
                    ->whereNull('comments.admin_reviewed_at')
                    ->where('comments.created_at', '>', now()->subDays($reviewDays));
            } elseif ($tab === 'reports') {
                $query->whereNull('comments.deleted_at')
                    ->whereHas('reports');
            } else {
                match ($status) {
                    'pending_review' => $query->where('moderation_status', 'approved')
                        ->whereNull('comments.deleted_at')
                        ->where('comments.is_hidden', false)
                        ->whereNull('comments.admin_reviewed_at'),
                    'reviewed' => $query->whereNotNull('comments.admin_reviewed_at')
                        ->whereNull('comments.deleted_at'),
                    'hidden' => $query->whereNull('comments.deleted_at')
                        ->where('comments.is_hidden', true),
                    'with_reports' => $query->whereNull('comments.deleted_at')
                        ->whereHas('reports'),
                    'deleted' => $query->whereNotNull('comments.deleted_at'),
                    'pending_purge' => $query->whereNotNull('comments.deleted_at')
                        ->where('comments.deleted_at', '>=', now()->subDays($graceDays)),
                    'recently_deleted' => $query->whereNotNull('comments.deleted_at')
                        ->where('comments.deleted_at', '>=', now()->subDays($graceDays)),
                    'expiring_soon' => $query->where('moderation_status', 'approved')
                        ->whereNull('comments.deleted_at')
                        ->where('comments.is_hidden', false)
                        ->whereNull('comments.admin_reviewed_at')
                        ->where('comments.created_at', '<=', now()->subDays($reviewDays - $expiringDays))
                        ->where('comments.created_at', '>', now()->subDays($reviewDays)),
                    default => null,
                };
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where('comment_content', 'like', "%{$search}%");
            }

            $perPage = min(max((int) $request->input('per_page', 15), 1), 50);
            $comments = $query->orderBy('comments.created_at', $sortDir)->paginate($perPage);

            $includeReportDetails = $tab === 'reports' || $status === 'with_reports';

            $comments->getCollection()->transform(function (Comment $comment) use ($includeReportDetails) {
                return $this->transformComment($comment, $includeReportDetails);
            });

            return response()->json([
                'data' => $comments->items(),
                'current_page' => $comments->currentPage(),
                'last_page' => $comments->lastPage(),
                'per_page' => $comments->perPage(),
                'total' => $comments->total(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Admin comments index error: '.$e->getMessage());

            return response()->json(['message' => 'Ошибка при загрузке комментариев'], 500);
        }
    }

    public function confirm(int $id): JsonResponse
    {
        try {
            $comment = Comment::withTrashed()->findOrFail($id);
            if ($comment->deleted_at) {
                return response()->json(['message' => 'Комментарий удалён'], 422);
            }
            $this->moderation->confirmReview($comment);

            return response()->json(['message' => 'Комментарий подтверждён']);
        } catch (\Throwable $e) {
            Log::error('Admin confirm comment error: '.$e->getMessage());

            return response()->json(['message' => 'Ошибка при подтверждении'], 500);
        }
    }

    public function unhide(int $id): JsonResponse
    {
        try {
            $comment = Comment::findOrFail($id);
            if ($comment->deleted_at) {
                return response()->json(['message' => 'Комментарий удалён'], 422);
            }
            $this->moderation->unhideComment($comment);
            if (! $comment->admin_reviewed_at) {
                $this->moderation->confirmReview($comment);
            }

            return response()->json(['message' => 'Комментарий снова отображается на сайте']);
        } catch (\Throwable $e) {
            Log::error('Admin unhide comment error: '.$e->getMessage());

            return response()->json(['message' => 'Ошибка при восстановлении видимости'], 500);
        }
    }

    public function dismissReports(int $id): JsonResponse
    {
        try {
            $comment = Comment::findOrFail($id);
            if ($comment->deleted_at) {
                return response()->json(['message' => 'Комментарий удалён'], 422);
            }
            if (! $comment->reports()->exists()) {
                return response()->json(['message' => 'Жалоб на этот комментарий нет'], 422);
            }

            $this->moderation->dismissAllReports($comment);

            $this->userNotifications->notifyCommentReporters(
                $comment,
                'Модератор рассмотрел жалобу. Комментарий остаётся на сайте.'
            );

            return response()->json(['message' => 'Жалобы сняты, комментарий остаётся на сайте']);
        } catch (\Throwable $e) {
            Log::error('Admin dismissReports error: '.$e->getMessage());

            return response()->json(['message' => 'Ошибка при снятии жалоб'], 500);
        }
    }

    public function destroy(Request $request, Comment $comment): JsonResponse
    {
        try {
            $data = $request->validate([
                'reason' => 'nullable|string|max:1000',
            ]);
            $reason = trim((string) ($data['reason'] ?? ''));
            $comment->loadMissing(['author', 'post']);
            $author = $comment->author;

            if ($comment->trashed()) {
                return response()->json(['message' => 'Комментарий уже удалён'], 422);
            }

            $this->moderation->softDeleteByAdmin($comment);

            if ($author) {
                $fresh = $comment->fresh();
                $fresh->loadMissing('post');
                $this->userNotifications->notify(
                    $author,
                    UserNotificationType::CommentDeleted,
                    [
                        'delete_context' => 'Ваш комментарий удалён администратором.',
                        'title' => $fresh->post?->post_title ?? 'Публикация',
                        'post_id' => (string) ($fresh->post_id ?? ''),
                        'reason' => $reason,
                    ],
                    new CommentRemovedByAdminNotification(
                        $fresh,
                        $reason !== '' ? $reason : null,
                        now()
                    ),
                    ['comment_id' => $fresh->id, 'post_id' => $fresh->post_id]
                );
                $this->userNotifications->notifyCommentReporters(
                    $fresh,
                    'По результатам проверки комментарий удалён модератором.'
                );
            }

            $days = ContentRetention::graceDays();

            return response()->json([
                'message' => "Комментарий удалён. Восстановление доступно в течение {$days} дней.",
            ]);
        } catch (\Throwable $e) {
            Log::error('Admin destroy comment error: '.$e->getMessage());

            return response()->json(['message' => 'Ошибка при удалении комментария'], 500);
        }
    }

    public function destroyWithBannedWords(Request $request, int $id): JsonResponse
    {
        try {
            $data = $request->validate([
                'words' => 'nullable|array',
                'words.*' => 'string|max:255',
                'word' => 'nullable|string|max:255',
                'reason' => 'nullable|string|max:1000',
            ]);

            $comment = Comment::withTrashed()->findOrFail($id);
            if ($comment->trashed()) {
                return response()->json(['message' => 'Комментарий уже удалён'], 422);
            }

            $words = $data['words'] ?? [];
            if (! empty($data['word'])) {
                $words[] = $data['word'];
            }
            if (! empty($words)) {
                $this->moderation->addBannedWords($words);
            }

            $reason = trim((string) ($data['reason'] ?? ''));
            $comment->loadMissing('author');
            $this->moderation->softDeleteByAdmin($comment);

            if ($comment->author) {
                $fresh = $comment->fresh();
                $fresh->loadMissing('post');
                $this->userNotifications->notify(
                    $comment->author,
                    UserNotificationType::CommentDeleted,
                    [
                        'delete_context' => 'Ваш комментарий удалён администратором.',
                        'title' => $fresh->post?->post_title ?? 'Публикация',
                        'post_id' => (string) ($fresh->post_id ?? ''),
                        'reason' => $reason,
                    ],
                    new CommentRemovedByAdminNotification(
                        $fresh,
                        $reason !== '' ? $reason : null,
                        now()
                    ),
                    ['comment_id' => $fresh->id, 'post_id' => $fresh->post_id]
                );
                $this->userNotifications->notifyCommentReporters(
                    $fresh,
                    'По результатам проверки комментарий удалён модератором.'
                );
            }

            $days = ContentRetention::graceDays();

            return response()->json([
                'message' => "Комментарий удалён, слова добавлены в словарь. Восстановление — {$days} дн.",
            ]);
        } catch (\Throwable $e) {
            Log::error('Admin destroyWithBannedWords error: '.$e->getMessage());

            return response()->json(['message' => 'Ошибка при удалении'], 500);
        }
    }

    public function restore(int $id): JsonResponse
    {
        try {
            $comment = Comment::withTrashed()
                ->with(['post' => fn ($q) => $q->withTrashed()])
                ->findOrFail($id);

            if (! $comment->trashed()) {
                return response()->json(['message' => 'Комментарий не удалён'], 422);
            }

            if (! ContentRetention::canRestore($comment->deleted_at)) {
                return response()->json([
                    'message' => 'Срок восстановления истёк. Комментарий будет удалён окончательно.',
                ], 422);
            }

            $post = $comment->post;
            if (! $post || $post->trashed()) {
                return response()->json(['message' => 'Публикация недоступна для восстановления комментария'], 422);
            }

            $wasApproved = $comment->moderation_status === 'approved' && ! $comment->is_hidden;
            $comment->restore();

            if ($wasApproved && $post->isPubliclyVisible()) {
                $post->increment('comment_count');
            }

            $comment->loadMissing(['author', 'post']);
            if ($comment->author) {
                $this->userNotifications->notify(
                    $comment->author,
                    UserNotificationType::CommentRestored,
                    [
                        'title' => $comment->post?->post_title ?? 'Публикация',
                        'post_id' => (string) ($comment->post_id ?? ''),
                    ],
                    new CommentRestoredNotification($comment),
                    ['comment_id' => $comment->id, 'post_id' => $comment->post_id]
                );
            }

            return response()->json(['message' => 'Комментарий восстановлен']);
        } catch (\Throwable $e) {
            Log::error('Admin restore comment error: '.$e->getMessage());

            return response()->json(['message' => 'Ошибка при восстановлении комментария'], 500);
        }
    }

    /**
     * Одобрение комментария, не прошедшего автомодерацию (legacy).
     */
    public function approve(int $id): JsonResponse
    {
        try {
            $comment = Comment::withTrashed()
                ->with(['post' => fn ($q) => $q->withTrashed()])
                ->findOrFail($id);

            if ($comment->deleted_at && (bool) $comment->auto_moderation_passed === false) {
                if (! ContentRetention::canRestore($comment->deleted_at)) {
                    return response()->json(['message' => 'Срок восстановления истёк'], 422);
                }
                $comment->restore();
            } elseif ($comment->deleted_at) {
                return response()->json(['message' => 'Нельзя одобрить удалённый комментарий'], 422);
            }

            $post = $comment->post;
            if (! $post || $post->deleted_at || ! $post->isPubliclyVisible()) {
                return response()->json(['message' => 'Публикация недоступна'], 422);
            }

            if ($comment->moderation_status !== 'approved') {
                $comment->update([
                    'moderation_status' => 'approved',
                    'approved_at' => now(),
                    'is_hidden' => false,
                    'hidden_at' => null,
                ]);
                $post->increment('comment_count');
            }

            if (! $comment->admin_reviewed_at) {
                $this->moderation->confirmReview($comment);
            }

            $comment->loadMissing(['author', 'post']);
            if ($comment->author) {
                $this->userNotifications->notify(
                    $comment->author,
                    UserNotificationType::CommentPublished,
                    [
                        'title' => $comment->post?->post_title ?? 'Публикация',
                        'post_id' => (string) ($comment->post_id ?? ''),
                    ],
                    null,
                    ['comment_id' => $comment->id, 'post_id' => $comment->post_id]
                );
            }

            return response()->json(['message' => 'Комментарий одобрен']);
        } catch (\Throwable $e) {
            Log::error('Admin approve comment error: '.$e->getMessage());

            return response()->json(['message' => 'Ошибка при одобрении комментария'], 422);
        }
    }

    private function transformComment(Comment $comment, bool $withReports = false): Comment
    {
        $comment->setAttribute('author_deleted', (bool) optional($comment->author)->deleted_at);
        $comment->setAttribute('reports_count', (int) ($comment->reports_count ?? 0));
        $comment->setAttribute('is_admin_reviewed', $comment->admin_reviewed_at !== null);

        foreach (ContentRetention::trashedMeta($comment->deleted_at) as $key => $value) {
            $comment->setAttribute($key, $value);
        }

        if ($comment->deleted_at === null) {
            foreach (ContentRetention::commentQueueMeta($comment->created_at, $comment->admin_reviewed_at) as $key => $value) {
                $comment->setAttribute($key, $value);
            }
        }

        if ($withReports) {
            $reports = CommentReport::query()
                ->where('comment_id', $comment->id)
                ->with(['reporter:id,name,user_surname,email,username'])
                ->orderByDesc('created_at')
                ->get()
                ->map(fn (CommentReport $r) => [
                    'id' => $r->id,
                    'reason' => $r->reason,
                    'reason_label' => CommentReport::reasonLabel($r->reason),
                    'other_text' => $r->other_text,
                    'created_at' => $r->created_at?->toIso8601String(),
                    'reporter' => $r->reporter ? [
                        'id' => $r->reporter->id,
                        'name' => $r->reporter->name,
                        'user_surname' => $r->reporter->user_surname,
                        'email' => $r->reporter->email,
                        'username' => $r->reporter->username,
                    ] : null,
                ]);
            $comment->setAttribute('reports', $reports);
            $comment->setAttribute('report_reasons', $reports->pluck('reason_label')->unique()->values());
        }

        return $comment;
    }
}
