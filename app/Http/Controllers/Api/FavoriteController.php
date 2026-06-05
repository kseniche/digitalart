<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Enums\UserNotificationType;
use App\Models\Like;
use App\Models\Post;
use App\Services\UserNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Критерий 3.8: избранное.
 */
class FavoriteController extends Controller
{
    public function __construct(
        private readonly UserNotificationService $userNotifications,
    ) {}

    /**
     * Добавить/убрать пост из избранного.
     * POST /api/posts/{id}/favorite
     */
    public function toggleFavorite(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        $post = Post::find($id);

        if (!$post) {
            return response()->json(['message' => 'Публикация не найдена'], 404);
        }

        $exists = $user->favorites()->where('post_id', $id)->exists();

        if ($exists) {
            $user->favorites()->detach($id);
            return response()->json(['is_favorited' => false]);
        }

        if (!$post->isPubliclyVisible()) {
            return response()->json(['message' => 'Публикация недоступна'], 404);
        }

        $user->favorites()->attach($id);

        // Внутреннее уведомление владельцу поста (не отправляем, если пользователь добавил свой пост)
        if ($post->user_id !== $user->id) {
            $post->load('author');
            if ($post->author) {
                $byName = trim(($user->name ?? '').' '.($user->user_surname ?? ''));
                $this->userNotifications->notify(
                    $post->author,
                    UserNotificationType::PostFavorited,
                    [
                        'title' => $post->post_title ?? 'Публикация',
                        'post_id' => (string) $post->id,
                        'by_name' => $byName !== '' ? $byName : 'Пользователь',
                    ],
                    null,
                    ['post_id' => $post->id, 'by_user_id' => $user->id]
                );
            }
        }

        return response()->json(['is_favorited' => true]);
    }

    /**
     * Список избранных постов текущего пользователя (пагинация).
     * GET /api/profile/favorites
     * Формат как у ленты: data, current_page, last_page, per_page.
     */
    public function getMyFavorites(Request $request): JsonResponse
    {
        try {
            $perPage = (int) $request->input('per_page', 12);
            $perPage = $perPage >= 1 && $perPage <= 50 ? $perPage : 12;

            $query = $request->user()
                ->favorites()
                ->with(['author:id,name,user_surname,avatar', 'category:id,name'])
                ->whereHas('author', fn ($q) => $q->whereNull('users.deleted_at'))
                ->orderByDesc('favorites.created_at');

            $paginated = $query->paginate($perPage, ['posts.*'], 'page', $request->input('page', 1));

            $userId = $request->user()->id;
            $postIds = $paginated->getCollection()->pluck('id')->all();
            $likedIds = Like::where('user_id', $userId)
                ->whereIn('post_id', $postIds)
                ->whereNull('deleted_at')
                ->pluck('post_id')
                ->flip()
                ->all();

            $paginated->getCollection()->transform(function ($post) use ($userId, $likedIds) {
                $post->setAttribute('category', $post->category?->name);
                $post->setAttribute('liked', isset($likedIds[$post->id]));
                $post->setAttribute('is_favorited', true);
                return $post;
            });

            return response()->json([
                'data' => $paginated->items(),
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Ошибка при загрузке избранного', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Не удалось загрузить избранное'], 500);
        }
    }
}
