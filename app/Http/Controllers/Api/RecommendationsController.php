<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Рекомендации (критерий 3.9): блок «Вам может понравиться».
 * Алгоритм с учётом тегов, категорий, просмотров, лайков и истории (лайки/избранное пользователя).
 */
class RecommendationsController extends Controller
{
    private const LIMIT = 6;

    /**
     * GET /api/recommendations?post_id=123
     * Без post_id: для гостя — популярные; для авторизованного — с учётом истории (лайки, избранное).
     * С post_id: посты, похожие на указанный (категория ИЛИ теги), затем по популярности.
     */
    public function index(Request $request)
    {
        try {
            return $this->getRecommendations($request);
        } catch (\Throwable $e) {
            Log::error('RecommendationsController::index', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'post_id' => $request->input('post_id'),
            ]);
            return response()->json([]);
        }
    }

    private function getRecommendations(Request $request)
    {
        $postId = $request->input('post_id') ? (int) $request->input('post_id') : null;
        $user = $request->user();

        $query = Post::query()
            ->with(['author:id,name,user_surname,avatar', 'category:id,name'])
            ->whereHas('author', fn ($q) => $q->whereNull('users.deleted_at'))
            ->where('is_draft', false)
            ->where('moderation_status', 'approved')
            ->where(function ($q) {
                $q->whereNull('published_at')->orWhere('published_at', '<=', now());
            });

        if ($postId) {
            $source = Post::find($postId);
            if (!$source) {
                return response()->json([]);
            }
            $query->where('posts.id', '!=', $postId);
            $categoryId = $source->category_id;
            $tags = is_array($source->tags) ? $source->tags : (array) json_decode((string) $source->tags, true);
            $tags = array_filter(array_map('trim', $tags));

            // Похожие по категории и/или по тегам; если ни того ни другого — просто по популярности
            if ($categoryId || count($tags) > 0) {
                $query->where(function ($q) use ($categoryId, $tags) {
                    if ($categoryId) {
                        $q->where('posts.category_id', $categoryId);
                    }
                    if (count($tags) > 0) {
                        foreach (array_slice($tags, 0, 10) as $tag) {
                            $q->orWhereJsonContains('posts.tags', $tag);
                        }
                    }
                });
            }

            if ($categoryId) {
                $query->orderByRaw('(CASE WHEN posts.category_id = ? THEN 1 ELSE 0 END) DESC', [$categoryId]);
            }
            $query->orderByDesc('like_count');
            $query->orderByDesc(DB::raw('COALESCE(posts.view_count, 0)'));
            $query->orderByDesc('posts.created_at');

        } else {
            // Нет post_id: персонализация по истории (лайки + избранное) или популярные
            $excludeIds = [];
            if ($user) {
                $likedIds = DB::table('likes')
                    ->where('user_id', $user->id)
                    ->whereNull('deleted_at')
                    ->pluck('post_id')
                    ->all();
                $favoritedIds = $user->favorites()->pluck('posts.id')->all();
                $excludeIds = array_unique(array_merge($likedIds, $favoritedIds));
            }
            if (count($excludeIds) > 0) {
                $query->whereNotIn('posts.id', $excludeIds);
            }

            if ($user) {
                // История: категории и теги из лайкнутых и избранных постов
                $historyPostIds = array_merge(
                    DB::table('likes')->where('user_id', $user->id)->whereNull('deleted_at')->pluck('post_id')->all(),
                    $user->favorites()->pluck('posts.id')->all()
                );
                $historyPostIds = array_unique(array_filter($historyPostIds));
                if (count($historyPostIds) > 0) {
                    $historyData = Post::whereIn('id', $historyPostIds)
                        ->select('category_id', 'tags')
                        ->get();
                    $preferCategoryIds = $historyData->pluck('category_id')->filter()->unique()->values()->all();
                    $preferTags = [];
                    foreach ($historyData->pluck('tags') as $t) {
                        if (is_array($t)) {
                            $preferTags = array_merge($preferTags, $t);
                        }
                    }
                    $preferTags = array_values(array_unique(array_filter(array_map('trim', $preferTags))));

                    // Предпочитаем посты из тех же категорий или с совпадающими тегами (история)
                    if (count($preferCategoryIds) > 0 || count($preferTags) > 0) {
                        $query->where(function ($q) use ($preferCategoryIds, $preferTags) {
                            if (count($preferCategoryIds) > 0) {
                                $q->whereIn('posts.category_id', $preferCategoryIds);
                            }
                            if (count($preferTags) > 0) {
                                foreach (array_slice($preferTags, 0, 8) as $tag) {
                                    $q->orWhereJsonContains('posts.tags', $tag);
                                }
                            }
                        });
                    }
                }
            }

            $query->orderByDesc('like_count');
            $query->orderByDesc(DB::raw('COALESCE(view_count, 0)'));
            $query->orderByDesc('created_at');
        }

        $posts = $query->take(self::LIMIT)->get();

        $posts->transform(function ($p) {
            $p->setAttribute('category', $p->category?->name);
            return $p;
        });

        if ($request->user()) {
            $userId = $request->user()->id;
            $ids = $posts->pluck('id')->all();
            $likedIds = \App\Models\Like::where('user_id', $userId)->whereIn('post_id', $ids)->whereNull('deleted_at')->pluck('post_id')->flip()->all();
            $favoritedIds = $request->user()->favorites()->whereIn('post_id', $ids)->pluck('post_id')->flip()->all();
            $posts->transform(function ($p) use ($likedIds, $favoritedIds) {
                $p->setAttribute('liked', isset($likedIds[$p->id]));
                $p->setAttribute('is_favorited', isset($favoritedIds[$p->id]));
                return $p;
            });
        }

        return response()->json($posts);
    }
}
