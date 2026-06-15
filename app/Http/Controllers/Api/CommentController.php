<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserNotificationType;
use App\Http\Controllers\Controller;
use App\Models\Comment;
use App\Models\Post;
use App\Services\AutoModerationService;
use App\Services\UserNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CommentController extends Controller
{
    public function __construct(
        private readonly AutoModerationService $autoModerationService,
        private readonly UserNotificationService $userNotifications,
    ) {}

    public function store(Request $request, Post $post)
    {
        if (! $request->user()->comment_rules_accepted_at) {
            return response()->json([
                'message' => 'Перед отправкой комментариев необходимо принять правила сообщества',
                'code' => 'comment_rules_not_accepted',
            ], 403);
        }

        $data = $request->validate([
            'content' => ['required', 'string', 'max:2000'],
        ], [
            'content.required' => 'Содержание комментария обязательно',
            'content.string' => 'Содержание комментария должно быть строкой',
            'content.max' => 'Комментарий не должен превышать 2000 символов',
        ]);

        if (!$post->isPubliclyVisible()) {
            return response()->json(['message' => 'Публикация недоступна'], 404);
        }

        try {
            $autoModeration = $this->autoModerationService->checkText((string) $data['content']);
            $autoModerationPassed = (bool) $autoModeration['passed'];
            $autoModerationReason = $autoModerationPassed
                ? null
                : ($autoModeration['reason'] ?? 'Нарушение правил сообщества.');
            $moderationStatus = $autoModerationPassed ? 'approved' : 'pending';

            $comment = Comment::create([
                'comment_content' => $data['content'],
                'user_id' => $request->user()->id,
                'post_id' => $post->id,
                'moderation_status' => $moderationStatus,
                'approved_at' => $autoModerationPassed ? now() : null,
                'auto_moderation_passed' => $autoModerationPassed,
                'auto_moderation_reason' => $autoModerationReason,
                'auto_moderation_checked_at' => now(),
            ]);

            if (!$autoModerationPassed) {
                $comment->delete();
            } else {
                $post->increment('comment_count');
            }

            // Загружаем автора с аватаром
            $comment->load('author:id,name,user_surname,avatar');

            $author = $request->user();
            if ($autoModerationPassed) {
                $this->userNotifications->notify(
                    $author,
                    UserNotificationType::CommentPublished,
                    [
                        'title' => $post->post_title ?? 'Публикация',
                        'post_id' => (string) $post->id,
                    ],
                    null,
                    ['comment_id' => $comment->id, 'post_id' => $post->id]
                );
            }

            if ($autoModerationPassed && $post->user_id !== $request->user()->id) {
                $post->load('author');
                if ($post->author) {
                    $authorName = trim($author->name.' '.($author->user_surname ?? ''));
                    $this->userNotifications->notify(
                        $post->author,
                        UserNotificationType::CommentOnYourPost,
                        [
                            'author_name' => $authorName !== '' ? $authorName : 'Пользователь',
                            'title' => $post->post_title ?? 'Публикация',
                            'post_id' => (string) $post->id,
                            'comment_excerpt' => $comment->comment_content,
                        ],
                        null,
                        ['comment_id' => $comment->id, 'post_id' => $post->id]
                    );
                }
            }

            return response()->json([
                'message' => $autoModerationPassed
                    ? 'Комментарий опубликован'
                    : 'Комментарий не прошел автомодерацию и скрыт до решения администратора',
                'comment' => [
                    'id' => $comment->id,
                    'content' => $comment->comment_content,
                    'author' => [
                        'id' => $comment->author->id,
                        'name' => $comment->author->name,
                        'surname' => $comment->author->user_surname,
                        'avatar' => $comment->author->avatar,
                        'avatar_url' => $comment->author->avatar_url,
                    ],
                    'created_at' => $comment->created_at,
                    'auto_moderation_passed' => $autoModerationPassed,
                    'auto_moderation_reason' => $autoModerationReason,
                ]
            ], 201);
        } catch (\Throwable $e) {
            Log::error('Ошибка при создании комментария', [
                'post_id' => $post->id,
                'user_id' => $request->user()->id,
                'error' => $e->getMessage(),
            ]);
            return response()->json(['message' => 'Не удалось добавить комментарий'], 500);
        }
    }

    public function destroy(Comment $comment, Request $request)
    {
        try {
            // Проверяем права
            if ($comment->user_id !== $request->user()->id && !$request->user()->hasRole('admin')) {
                return response()->json(['message' => 'Недостаточно прав'], 403);
            }

            $post = $comment->post;
            $wasApproved = $comment->moderation_status === 'approved';
            $comment->delete();

            // Обновляем счетчик комментариев
            if ($wasApproved && $post && $post->comment_count > 0) {
                $post->decrement('comment_count');
            }

            $comment->loadMissing('post');
            $this->userNotifications->notify(
                $request->user(),
                UserNotificationType::CommentDeleted,
                [
                    'delete_context' => 'Вы удалили свой комментарий.',
                    'title' => $comment->post?->post_title ?? 'Публикация',
                    'post_id' => (string) ($comment->post_id ?? ''),
                    'reason' => '',
                ],
                null,
                ['comment_id' => $comment->id, 'post_id' => $comment->post_id]
            );

            return response()->json([
                'message' => 'Комментарий удален'
            ], 200);

        } catch (\Throwable $e) {
            Log::error('Ошибка при удалении комментария', [
                'comment_id' => $comment->id,
                'error' => $e->getMessage(),
            ]);
            return response()->json(['message' => 'Не удалось удалить комментарий'], 500);
        }
    }

    /**
     * Toggle лайк комментария (критерий 3.7). POST /api/comments/{id}/like
     */
    public function toggleLike(Request $request, $id)
    {
        $comment = Comment::withCount('likes')->with('post')->find($id);
        if (!$comment) {
            return response()->json(['message' => 'Комментарий не найден'], 404);
        }

        if (($comment->moderation_status ?? '') !== 'approved' || $comment->is_hidden) {
            return response()->json(['message' => 'Комментарий недоступен'], 404);
        }

        $post = $comment->post;
        if (!$post || !$post->isPubliclyVisible()) {
            return response()->json(['message' => 'Комментарий недоступен'], 404);
        }

        $user = $request->user();
        $exists = $comment->likes()->where('user_id', $user->id)->exists();
        $likesCount = (int) $comment->likes_count;

        if ($exists) {
            $comment->likes()->detach($user->id);
            return response()->json(['liked' => false, 'likes_count' => max(0, $likesCount - 1)]);
        }
        $comment->likes()->attach($user->id);
        return response()->json(['liked' => true, 'likes_count' => $likesCount + 1]);
    }
}