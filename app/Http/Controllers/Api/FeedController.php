<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Follower;
use App\Models\Post;
use App\Support\PostTags;
use App\Support\TagSearchLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class FeedController extends Controller
{
    /** Допустимые поля сортировки */
    private const SORT_BY_ALLOWED = ['created_at', 'post_title', 'like_count'];

    /** Допустимые направления сортировки */
    private const SORT_DIR_ALLOWED = ['asc', 'desc'];

    /** Допустимые значения per_page (2.3.7) */
    private const PER_PAGE_ALLOWED = [10, 25, 50];

    /** Значение per_page по умолчанию */
    private const PER_PAGE_DEFAULT = 12;

    /**
     * Лента постов. Поддерживает q, tag, category_id, sort_by, sort_dir, per_page, following.
     */
    public function index(Request $request)
    {
        $tagSearchNeedle = null;
        $followingFilter = $request->boolean('following');
        $followingSubscriptionsCount = null;

        try {
            if ($followingFilter && ! $request->user()) {
                return response()->json(['message' => 'Для ленты подписок необходимо войти в систему'], 401);
            }

            $query = Post::with(['author:id,name,user_surname,avatar', 'category:id,name']);

            $query->whereHas('author', function ($q) {
                $q->whereNull('users.deleted_at');
            });

            $query->where('is_draft', false);
            $query->where('moderation_status', 'approved');
            // Критерий 3.3.5: в ленте только опубликованные и запланированные на текущий момент или раньше
            $query->where(function ($q) {
                $q->whereNull('published_at')->orWhere('published_at', '<=', now());
            });

            if ($followingFilter) {
                $followingIds = Follower::query()
                    ->where('follower_id', $request->user()->id)
                    ->whereNull('deleted_at')
                    ->whereHas('following', fn ($q) => $q->whereNull('users.deleted_at'))
                    ->pluck('following_id');

                $followingSubscriptionsCount = $followingIds->count();

                if ($followingIds->isEmpty()) {
                    $query->whereRaw('0 = 1');
                } else {
                    $query->whereIn('user_id', $followingIds);
                }
            }

            // ——— 2.3.1 Фильтрация (минимум 3 параметра) ———
            // 1) Поиск (q): по заголовку, содержимому, тегам
            if ($search = $request->input('q')) {
                $search = trim((string) $search);
                if ($search !== '') {
                    $query->where(function ($q) use ($search) {
                        $q->where('post_title', 'like', '%' . $search . '%')
                            ->orWhere('post_content', 'like', '%' . $search . '%')
                            ->orWhere('tags', 'like', '%' . $search . '%');
                    });
                }
            }

            // 2) Фильтр по тегу (tag) — частичное совпадение в названии тега
            if ($tag = $request->input('tag')) {
                $tag = trim((string) $tag);
                if ($tag !== '') {
                    $tagSearchNeedle = $tag;
                    TagSearchLogger::info('tag_filter.request', [
                        'tag' => $tag,
                        'q' => $request->input('q'),
                        'category_id' => $request->input('category_id', $request->input('category')),
                        'page' => $request->input('page'),
                        'per_page' => $request->input('per_page'),
                        'sort_by' => $request->input('sort_by'),
                        'sort_dir' => $request->input('sort_dir'),
                        'full_query_string' => $request->getQueryString(),
                    ]);
                    $this->applyTagFilter($query, $tag);
                    TagSearchLogger::logFilterApplied($tag, $query, [
                        'stage' => 'after_apply_filter',
                    ]);
                }
            }

            // 3) Фильтр по категории: ?category=3 или ?category_id=3
            $categoryId = $request->input('category_id', $request->input('category'));
            if ($categoryId !== null && $categoryId !== '' && (int) $categoryId > 0) {
                $query->where('category_id', (int) $categoryId);
            }

            // ——— 2.3.2–2.3.4 Сортировка ———
            $sortBy = $request->input('sort_by');
            $sortDir = $request->input('sort_dir');
            $useNewSort = in_array($sortBy, self::SORT_BY_ALLOWED, true)
                && in_array(strtolower((string) $sortDir), self::SORT_DIR_ALLOWED, true);

            if ($useNewSort) {
                $dir = strtolower((string) $sortDir) === 'desc' ? 'desc' : 'asc';
                $query->orderBy($sortBy, $dir);
            } else {
                // Обратная совместимость: sort=popular | new
                $sort = $request->input('sort');
                if ($sort === 'popular') {
                    $query->orderByDesc('like_count');
                } elseif ($sort === 'new' || $sort === 'newest') {
                    $query->orderByDesc('created_at');
                } else {
                    $query->orderByDesc('created_at');
                }
            }

            // ——— 2.3.7 Количество на странице: 10, 25, 50 ———
            $perPage = $request->input('per_page');
            if ($perPage !== null && in_array((int) $perPage, self::PER_PAGE_ALLOWED, true)) {
                $perPage = (int) $perPage;
            } else {
                $perPage = self::PER_PAGE_DEFAULT;
            }

            $paginated = $query->paginate($perPage);

            if ($tagSearchNeedle !== null) {
                $sample = $paginated->getCollection()->take(15)->map(function ($post) use ($tagSearchNeedle) {
                    $rawTags = $post->getRawOriginal('tags');
                    $parsed = PostTags::parse($rawTags ?? $post->tags);

                    return [
                        'id' => $post->id,
                        'title' => $post->post_title,
                        'tags_raw' => $rawTags,
                        'tags_parsed' => $parsed,
                        'matches_needle' => PostTags::anyContainsSubstring($parsed, $tagSearchNeedle),
                    ];
                })->values()->all();

                TagSearchLogger::logFeedResult(
                    $tagSearchNeedle,
                    $query,
                    $paginated->total(),
                    $sample,
                    [
                        'page' => $paginated->currentPage(),
                        'per_page' => $paginated->perPage(),
                        'last_page' => $paginated->lastPage(),
                    ]
                );
            }

            $authUser = $request->user();
            $likedIds = [];
            $favoritedIds = [];
            if ($authUser) {
                $postIds = $paginated->getCollection()->pluck('id')->all();
                $likedIds = \App\Models\Like::where('user_id', $authUser->id)
                    ->whereIn('post_id', $postIds)
                    ->whereNull('deleted_at')
                    ->pluck('post_id')
                    ->flip()
                    ->all();
                $favoritedIds = $authUser->favorites()->whereIn('post_id', $postIds)->pluck('post_id')->flip()->all();
            }

            $paginated->getCollection()->transform(function ($post) use ($authUser, $likedIds, $favoritedIds) {
                $post->setAttribute('category', $post->category?->name);
                if ($authUser) {
                    $post->setAttribute('liked', isset($likedIds[$post->id]));
                    $post->setAttribute('is_favorited', isset($favoritedIds[$post->id]));
                }

                return $post;
            });

            if ($followingFilter) {
                return response()->json(array_merge(
                    $paginated->toArray(),
                    [
                        'following_filter' => true,
                        'following_subscriptions_count' => $followingSubscriptionsCount,
                    ]
                ));
            }

            return $paginated;
        } catch (\Throwable $e) {
            if ($tagSearchNeedle !== null || $request->filled('tag')) {
                TagSearchLogger::logException($e, [
                    'tag' => $tagSearchNeedle ?? $request->input('tag'),
                    'query' => $request->query(),
                ]);
            }
            Log::error('Ошибка при получении ленты работ', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'query' => $request->query(),
            ]);
            return response()->json(['message' => 'Не удалось загрузить ленту'], 500);
        }
    }

    /**
     * Список уникальных тегов для фильтра (опционально для UI).
     * GET /api/tags
     */
    public function tags(Request $request)
    {
        $rows = Post::whereNotNull('tags')
            ->where('tags', '!=', '')
            ->whereHas('author', fn ($q) => $q->whereNull('users.deleted_at'))
            ->pluck('tags');

        $tags = [];
        foreach ($rows as $v) {
            $tags = array_merge($tags, PostTags::parse($v));
        }
        $tags = array_values(array_unique(array_filter($tags, fn ($t) => $t !== '')));
        sort($tags);

        return response()->json($tags);
    }

    /**
     * Фильтр по подстроке внутри отдельных тегов (не по всему полю tags целиком).
     */
    private function applyTagFilter($query, string $tag): void
    {
        PostTags::applyFilter($query, $tag);
    }
}