<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserNotificationType;
use App\Http\Controllers\Controller;
use App\Support\AdminReportCsvBuilder;
use App\Support\PostTags;
use App\Support\ReportPeriodResolver;
use App\Models\BannedWord;
use App\Models\User;
use App\Models\Post;
use App\Models\Comment;
use Illuminate\Database\QueryException;
use App\Notifications\CommentRemovedByAdminNotification;
use App\Notifications\CommentRestoredNotification;
use App\Notifications\PostApprovedNotification;
use App\Notifications\PostRemovedByAdminNotification;
use App\Notifications\PostRestoredNotification;
use App\Notifications\UserBannedNotification;
use App\Notifications\UserRoleChangedNotification;
use App\Notifications\UserUnbannedNotification;
use App\Services\PostReportService;
use App\Services\UserNotificationService;
use Spatie\Permission\Models\Role;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class AdminController extends Controller
{
    public function __construct(
        private readonly UserNotificationService $userNotifications,
        private readonly PostReportService $postReports,
    ) {}

    /**
     * Ограничиваем per_page для админки, чтобы избежать перегруза БД/памяти.
     */
    private function clampPerPage(Request $request, int $default = 20, int $min = 1, int $max = 100): int
    {
        $value = (int) $request->get('per_page', $default);

        if ($value < $min) {
            return $min;
        }

        if ($value > $max) {
            return $max;
        }

        return $value;
    }

    // Получить статистику для дашборда
    public function getStats(Request $request): JsonResponse
    {
        try {
            [$from, $to] = ReportPeriodResolver::resolve($request->input('period'));

            $userBase = User::withTrashed();
            $postBase = Post::withTrashed();
            $commentBase = Comment::withTrashed();

            if ($from && $to) {
                $userBase->whereBetween('created_at', [$from, $to]);
                $postBase->whereBetween('created_at', [$from, $to]);
                $commentBase->whereBetween('created_at', [$from, $to]);
            }

            $stats = [
                'period' => $request->input('period', 'all'),
                'period_from' => $from?->toIso8601String(),
                'period_to' => $to?->toIso8601String(),
                'total_users' => (clone $userBase)->count(),
                'active_users' => (clone $userBase)->whereNull('deleted_at')->count(),
                'deleted_users' => (clone $userBase)->whereNotNull('deleted_at')->count(),
                'total_posts' => (clone $postBase)->count(),
                'active_posts' => (clone $postBase)->whereNull('deleted_at')->count(),
                'deleted_posts' => (clone $postBase)->whereNotNull('deleted_at')->count(),
                'total_comments' => (clone $commentBase)->count(),
                'active_comments' => (clone $commentBase)->whereNull('deleted_at')->count(),
                'deleted_comments' => (clone $commentBase)->whereNotNull('deleted_at')->count(),
            ];

            return response()->json($stats);
        } catch (\Exception $e) {
            Log::error('Admin stats error: ' . $e->getMessage());
            return response()->json(['message' => 'Ошибка при загрузке статистики'], 500);
        }
    }

    public function usersStats(): JsonResponse
    {
        try {
            return response()->json([
                'active' => User::query()->whereNull('deleted_at')->where('is_banned', false)->count(),
                'banned' => User::query()->whereNull('deleted_at')->where('is_banned', true)->count(),
                'deleted' => User::onlyTrashed()->count(),
                'total' => User::withTrashed()->count(),
                'deleted_last_30_days' => User::onlyTrashed()
                    ->where('deleted_at', '>=', now()->subDays(30))
                    ->count(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Admin usersStats error: '.$e->getMessage());

            return response()->json(['message' => 'Ошибка при загрузке статистики'], 500);
        }
    }

    public function postsStats(): JsonResponse
    {
        try {
            return response()->json([
                'pending' => Post::query()
                    ->where('moderation_status', 'pending')
                    ->whereNull('deleted_at')
                    ->count(),
                'approved' => Post::query()
                    ->where('moderation_status', 'approved')
                    ->whereNull('deleted_at')
                    ->count(),
                'rejected' => Post::query()
                    ->where('moderation_status', 'rejected')
                    ->whereNull('deleted_at')
                    ->count(),
                'total' => Post::withTrashed()->count(),
                'deleted_last_30_days' => Post::onlyTrashed()
                    ->where('deleted_at', '>=', now()->subDays(30))
                    ->count(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Admin postsStats error: '.$e->getMessage());

            return response()->json(['message' => 'Ошибка при загрузке статистики'], 500);
        }
    }

    // Словарь запрещенных слов (автомодерация)
    public function getBannedWords(Request $request): JsonResponse
    {
        try {
            $query = BannedWord::query()->orderBy('word');

            if ($request->filled('search')) {
                $search = (string) $request->input('search');
                $query->where('word', 'like', "%{$search}%");
            }

            $perPage = $this->clampPerPage($request, 50, 1, 200);
            $words = $query->paginate($perPage);

            return response()->json([
                'data' => $words->items(),
                'current_page' => $words->currentPage(),
                'last_page' => $words->lastPage(),
                'per_page' => $words->perPage(),
                'total' => $words->total(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Admin getBannedWords error: ' . $e->getMessage());
            return response()->json(['message' => 'Ошибка при загрузке словаря'], 500);
        }
    }

    public function addBannedWord(Request $request): JsonResponse
    {
        try {
            $data = $request->validate([
                'word' => ['required', 'string', 'max:255'],
            ]);

            $word = mb_strtolower(trim((string) $data['word']));
            if ($word === '') {
                return response()->json(['message' => 'Слово не может быть пустым'], 422);
            }

            $exists = BannedWord::query()->whereRaw('LOWER(word) = ?', [$word])->exists();
            if ($exists) {
                return response()->json(['message' => 'Это слово уже есть в словаре'], 409);
            }

            $created = BannedWord::query()->create([
                'word' => $word,
                'created_by' => optional($request->user())->id,
            ]);

            return response()->json([
                'message' => 'Слово добавлено в словарь',
                'word' => $created,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error('Admin addBannedWord error: ' . $e->getMessage());
            return response()->json(['message' => 'Ошибка при добавлении слова'], 500);
        }
    }

    public function deleteBannedWord($id): JsonResponse
    {
        try {
            $word = BannedWord::query()->findOrFail($id);
            $word->delete();

            return response()->json(['message' => 'Слово удалено из словаря']);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Слово не найдено'], 404);
        } catch (\Throwable $e) {
            Log::error('Admin deleteBannedWord error: ' . $e->getMessage());
            return response()->json(['message' => 'Ошибка при удалении слова'], 500);
        }
    }

    /**
     * Список тегов из публикаций (агрегация, без отдельной таблицы).
     * GET /api/admin/tags
     */
    public function getTags(): JsonResponse
    {
        try {
            $merged = [];
            $rows = Post::withTrashed()
                ->whereNotNull('tags')
                ->where('tags', '!=', '')
                ->pluck('tags');

            foreach ($rows as $value) {
                foreach ($this->normalizePostTags($value) as $tag) {
                    $key = mb_strtolower($tag);
                    if (! isset($merged[$key])) {
                        $merged[$key] = ['name' => $tag, 'posts_count' => 0];
                    }
                    $merged[$key]['posts_count']++;
                }
            }

            $tags = array_values($merged);

            usort($tags, fn ($a, $b) => strcasecmp($a['name'], $b['name']));

            return response()->json($tags);
        } catch (\Throwable $e) {
            Log::error('Admin getTags error: ' . $e->getMessage());
            return response()->json(['message' => 'Ошибка при загрузке тегов'], 500);
        }
    }

    /**
     * Удалить тег из всех публикаций (публикации и пользователи не удаляются).
     * DELETE /api/admin/tags
     */
    public function deleteTag(Request $request): JsonResponse
    {
        try {
            $data = $request->validate([
                'tag' => 'required|string|min:1|max:255',
            ]);
            $tag = trim($data['tag']);
            if ($tag === '') {
                return response()->json(['message' => 'Укажите название тега'], 422);
            }

            $updated = 0;
            Post::withTrashed()
                ->whereNotNull('tags')
                ->where('tags', '!=', '')
                ->orderBy('id')
                ->chunkById(100, function ($posts) use ($tag, &$updated) {
                    foreach ($posts as $post) {
                        $tags = $this->normalizePostTags($post->tags);
                        $needle = mb_strtolower($tag);
                        $newTags = array_values(array_filter(
                            $tags,
                            fn (string $t) => mb_strtolower($t) !== $needle
                        ));
                        if (count($newTags) === count($tags)) {
                            continue;
                        }
                        $newTags = PostTags::normalizeForStorage($newTags);
                        $post->tags = $newTags;
                        $post->save();
                        $updated++;
                    }
                });

            return response()->json([
                'message' => $updated > 0
                    ? "Тег «{$tag}» удалён из {$updated} публикаций"
                    : "Тег «{$tag}» не найден в публикациях",
                'updated_posts' => $updated,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error('Admin deleteTag error: ' . $e->getMessage());
            return response()->json(['message' => 'Ошибка при удалении тега'], 500);
        }
    }

    /**
     * @param  mixed  $value
     * @return list<string>
     */
    private function normalizePostTags($value): array
    {
        return PostTags::parse($value);
    }

    // Получить всех пользователей (включая удаленных)
    public function getUsers(Request $request): JsonResponse
    {
        try {
            $query = User::with(['roles'])->withTrashed();
            
            // Фильтрация по статусу
            if ($request->has('status')) {
                switch ($request->status) {
                    case 'active':
                        $query->whereNull('deleted_at');
                        break;
                    case 'deleted':
                        $query->whereNotNull('deleted_at');
                        break;
                }
            }

            if ($request->filled('auto_moderation')) {
                switch ($request->input('auto_moderation')) {
                    case 'passed':
                        $query->where('comments.auto_moderation_passed', true);
                        break;
                    case 'failed':
                        $query->where('comments.auto_moderation_passed', false);
                        break;
                }
            }
            
            // Поиск по имени или email
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%")
                      ->orWhere('username', 'like', "%{$search}%");
                });
            }
            
            $perPage = $this->clampPerPage($request);
            $users = $query->orderBy('created_at', 'desc')->paginate($perPage);
            
            return response()->json([
                'data' => $users->items(),
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ]);
        } catch (\Exception $e) {
            Log::error('Admin getUsers error: ' . $e->getMessage());
            return response()->json(['message' => 'Ошибка при загрузке пользователей'], 500);
        }
    }
      //Получить детальную информацию о пользователе
    public function getUser(User $user): JsonResponse
    {
        try {
            $user->load([
                'roles', 
                'posts' => function($query) {
                    $query->withTrashed()
                          ->withCount(['likes', 'comments'])
                          ->orderBy('created_at', 'desc')
                          ->limit(10);
                }, 
                'comments' => function($query) {
                    $query->withTrashed()
                          ->with(['post' => function($q) {
                              $q->select('id', 'post_title', 'media_path', 'media_type');
                          }])
                          ->orderBy('created_at', 'desc')
                          ->limit(10);
                }
            ]);
            
            return response()->json($user);
        } catch (\Exception $e) {
            Log::error('Admin getUser error: ' . $e->getMessage());
            return response()->json(['message' => 'Ошибка при загрузке данных пользователя'], 500);
        }
    }
    
     // Удалить пользователя (soft delete)
    public function deleteUser(User $user): JsonResponse
    {
        try {
            if ($user->hasRole('admin')) {
                return response()->json(['message' => 'Нельзя удалить администратора'], 403);
            }
            
            $user->delete();
            
            return response()->json(['message' => 'Пользователь успешно удален']);
        } catch (\Exception $e) {
            Log::error('Admin deleteUser error: ' . $e->getMessage());
            return response()->json(['message' => 'Ошибка при удалении пользователя'], 500);
        }
    }
    
     // Восстановить пользователя
     
    public function restoreUser($id): JsonResponse
    {
        try {
            $user = User::withTrashed()->findOrFail($id);

            // Уникальность email/username не учитывает soft-deleted записи,
            // поэтому при конфликте восстановление может упасть с SQL error.
            $conflictEmail = $user->email
                ? User::where('email', $user->email)
                    ->whereNull('deleted_at')
                    ->where('id', '!=', $user->id)
                    ->exists()
                : false;

            $conflictUsername = $user->username
                ? User::where('username', $user->username)
                    ->whereNull('deleted_at')
                    ->where('id', '!=', $user->id)
                    ->exists()
                : false;

            if ($conflictEmail || $conflictUsername) {
                if ($conflictEmail && $conflictUsername) {
                    return response()->json([
                        'message' => 'Невозможно восстановить пользователя: email и username заняты активным пользователем'
                    ], 409);
                }

                if ($conflictEmail) {
                    return response()->json([
                        'message' => 'Невозможно восстановить пользователя: email занят активным пользователем'
                    ], 409);
                }

                return response()->json([
                    'message' => 'Невозможно восстановить пользователя: username занят активным пользователем'
                ], 409);
            }

            $user->restore();

            return response()->json(['message' => 'Пользователь успешно восстановлен']);
        } catch (QueryException $e) {
            Log::error('Admin restoreUser QueryException: ' . $e->getMessage());
            return response()->json(['message' => 'Ошибка восстановления пользователя (возможна коллизия email/username)'], 409);
        } catch (\Exception $e) {
            Log::error('Admin restoreUser error: ' . $e->getMessage());
            return response()->json(['message' => 'Ошибка при восстановлении пользователя'], 500);
        }
    }

    /** Заблокировать пользователя (критерий 3.6). Меняет только is_banned, soft delete не трогает. */
    public function banUser(Request $request, $id): JsonResponse
    {
        try {
            $data = $request->validate([
                'ban_reason' => 'required|string|min:3|max:1000',
            ]);

            if (!Schema::hasColumn('users', 'ban_reason')) {
                return response()->json([
                    'message' => 'Колонка ban_reason отсутствует. Выполните: php artisan migrate',
                ], 503);
            }

            $user = User::withTrashed()->findOrFail($id);
            if ($user->hasRole('admin')) {
                return response()->json(['message' => 'Нельзя заблокировать администратора'], 403);
            }
            $user->update([
                'is_banned' => true,
                'ban_reason' => $data['ban_reason'],
            ]);
            $user->load('roles');

            try {
                $this->userNotifications->notify(
                    $user,
                    UserNotificationType::AccountBanned,
                    [
                        'reason' => $data['ban_reason'],
                        'user_id' => (string) $user->id,
                    ],
                    new UserBannedNotification(now()),
                    ['ban_reason' => $data['ban_reason']]
                );
            } catch (\Throwable $notifyError) {
                Log::warning('banUser: уведомление не отправлено', [
                    'user_id' => $user->id,
                    'error' => $notifyError->getMessage(),
                ]);
            }

            return response()->json(['message' => 'Пользователь заблокирован', 'user' => $user]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Admin banUser error: ' . $e->getMessage());
            return response()->json(['message' => 'Ошибка при блокировке пользователя'], 500);
        }
    }

    /** Разблокировать пользователя (критерий 3.6). */
    public function unbanUser($id): JsonResponse
    {
        try {
            $user = User::withTrashed()->findOrFail($id);
            $user->update([
                'is_banned' => false,
                'ban_reason' => null,
            ]);
            $user->load('roles');
            $this->userNotifications->notify(
                $user,
                UserNotificationType::AccountUnbanned,
                ['user_id' => (string) $user->id],
                new UserUnbannedNotification()
            );

            return response()->json(['message' => 'Пользователь разблокирован', 'user' => $user]);
        } catch (\Exception $e) {
            Log::error('Admin unbanUser error: ' . $e->getMessage());
            return response()->json(['message' => 'Ошибка при разблокировке пользователя'], 500);
        }
    }

    /** Изменить роль пользователя (user | admin). */
    public function updateUserRole(Request $request, $id): JsonResponse
    {
        try {
            $data = $request->validate([
                'role' => 'required|string|in:user,admin',
            ]);

            $user = User::withTrashed()->findOrFail($id);

            if ((int) $user->id === (int) $request->user()->id) {
                return response()->json(['message' => 'Нельзя изменить свою роль'], 403);
            }

            if ($user->hasRole('admin') && $data['role'] === 'user') {
                $adminCount = User::role('admin')->count();
                if ($adminCount <= 1) {
                    return response()->json(['message' => 'Нельзя снять роль у последнего администратора'], 403);
                }
            }

            Role::findOrCreate($data['role']);
            $user->syncRoles([$data['role']]);
            $user->load('roles');

            $roleLabel = $this->userNotifications->roleLabel($data['role']);
            $this->userNotifications->notify(
                $user,
                UserNotificationType::RoleChanged,
                ['role_label' => $roleLabel, 'user_id' => (string) $user->id],
                new UserRoleChangedNotification($roleLabel),
                ['role' => $data['role']]
            );

            return response()->json([
                'message' => 'Роль пользователя обновлена',
                'user' => $user,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Admin updateUserRole error: '.$e->getMessage());

            return response()->json(['message' => 'Ошибка при изменении роли'], 500);
        }
    }
    
    // Получить все публикации (включая удаленные)
    public function getPosts(Request $request): JsonResponse
    {
        try {
            $query = Post::with([
                'author' => function($q) {
                    $q->withTrashed();
                },
                'category:id,name',
            ])->withTrashed();
            
            // Фильтрация по статусу
            if ($request->has('status')) {
                switch ($request->status) {
                    case 'pending':
                        $query->where('posts.moderation_status', 'pending')
                              ->whereNull('posts.deleted_at');
                        break;
                    case 'approved':
                        $query->where('posts.moderation_status', 'approved')
                              ->whereNull('posts.deleted_at');
                        break;
                    case 'rejected':
                        $query->where('posts.moderation_status', 'rejected')
                              ->whereNull('posts.deleted_at');
                        break;
                    case 'deleted':
                        $query->whereNotNull('posts.deleted_at');
                        break;
                }
            }
            
            // Поиск по заголовку или содержимому
            if ($request->filled('search')) {
                $search = (string) $request->input('search');
                $query->where(function ($q) use ($search) {
                    $q->where('post_title', 'like', "%{$search}%")
                      ->orWhere('post_content', 'like', "%{$search}%");
                });
            }

            // Поиск по тегам (частичное совпадение внутри тега)
            if ($request->filled('tag')) {
                PostTags::applyFilter($query, (string) $request->input('tag'));
            }

            // Фильтр по категории
            if ($request->filled('category_id')) {
                $query->where('category_id', (int) $request->input('category_id'));
            }

            // Фильтрация по автору (для страницы публикаций конкретного пользователя)
            if ($request->filled('user_id')) {
                $query->where('user_id', (int) $request->user_id);
            }
            
            $perPage = $this->clampPerPage($request);
            $sortDir = ($request->input('status') === 'pending') ? 'asc' : 'desc';
            $posts = $query->orderBy('created_at', $sortDir)->paginate($perPage);
            $posts->getCollection()->transform(function ($post) {
                $post->setAttribute('author_deleted', (bool) optional($post->author)->deleted_at);
                $isPending = ($post->moderation_status ?? '') === 'pending' && $post->deleted_at === null;
                $post->setAttribute(
                    'moderation_overdue',
                    $isPending
                        && $post->created_at
                        && $post->created_at->lt(now()->subDays(30))
                );
                foreach (\App\Support\ContentRetention::trashedMeta($post->deleted_at) as $key => $value) {
                    $post->setAttribute($key, $value);
                }

                return $post;
            });
            
            return response()->json([
                'data' => $posts->items(),
                'current_page' => $posts->currentPage(),
                'last_page' => $posts->lastPage(),
                'per_page' => $posts->perPage(),
                'total' => $posts->total(),
            ]);
        } catch (\Exception $e) {
            Log::error('Admin getPosts error: ' . $e->getMessage());
            return response()->json(['message' => 'Ошибка при загрузке публикаций'], 500);
        }
    }

    // Детали публикации для администратора (включая удаленные комментарии)
    public function getPost($id): JsonResponse
    {
        try {
            $post = Post::withTrashed()
                ->with([
                    'author' => function ($q) {
                        $q->withTrashed();
                    },
                    'category:id,name',
                ])
                ->withCount(['likes', 'comments'])
                ->findOrFail($id);

            $comments = Comment::withTrashed()
                ->where('post_id', $post->id)
                ->with([
                    'author' => function ($q) {
                        $q->withTrashed();
                    },
                    'post' => function ($q) {
                        $q->withTrashed();
                    },
                ])
                ->orderBy('created_at', 'desc')
                ->get();

            foreach (\App\Support\ContentRetention::trashedMeta($post->deleted_at) as $key => $value) {
                $post->setAttribute($key, $value);
            }

            $comments->each(function (Comment $comment) {
                foreach (\App\Support\ContentRetention::trashedMeta($comment->deleted_at) as $key => $value) {
                    $comment->setAttribute($key, $value);
                }
            });

            return response()->json([
                'post' => $post,
                'comments' => $comments,
            ]);
        } catch (\Exception $e) {
            Log::error('Admin getPost error: ' . $e->getMessage());
            return response()->json(['message' => 'Ошибка при загрузке публикации'], 500);
        }
    }
    // Отклонить публикацию (можно исправить и отправить повторно)
    public function rejectPost(Request $request, $id): JsonResponse
    {
        try {
            $post = Post::withTrashed()->with('author')->findOrFail($id);
            if ($post->deleted_at) {
                return response()->json(['message' => 'Нельзя отклонить удаленную публикацию'], 422);
            }
            $data = $request->validate([
                'reason' => 'nullable|string|max:1000',
            ]);
            $reason = trim((string) ($data['reason'] ?? ''));

            $post->update([
                'moderation_status' => 'rejected',
                'approved_at' => null,
                'moderation_rejection_reason' => $reason !== '' ? $reason : null,
            ]);

            if ($post->author) {
                $this->userNotifications->notify(
                    $post->author,
                    UserNotificationType::PostRejected,
                    [
                        'title' => $post->post_title ?: 'Без названия',
                        'post_id' => (string) $post->id,
                        'user_id' => (string) $post->author->id,
                        'reason' => $reason,
                    ],
                    new PostRemovedByAdminNotification($post, 'rejected', $reason !== '' ? $reason : null),
                    ['post_id' => $post->id]
                );
            }
            $this->postReports->notifyReportersOnPostMeasures(
                $post,
                $request->user(),
                'публикация отклонена модератором'
            );
            Log::info('Post rejected by admin', ['post_id' => $post->id, 'reason' => $reason]);

            return response()->json([
                'message' => 'Публикация отклонена. Пользователь может исправить её и отправить повторно.',
            ]);
        } catch (\Exception $e) {
            Log::error('Admin rejectPost error: ' . $e->getMessage());
            return response()->json(['message' => 'Ошибка при отклонении публикации'], 500);
        }
    }

    // Удалить публикацию за нарушение правил (soft delete без возможности исправить пользователем)
    public function deletePost(Request $request, Post $post): JsonResponse
    {
        try {
            $data = $request->validate([
                'reason' => 'nullable|string|max:1000',
            ]);
            $reason = trim((string) ($data['reason'] ?? ''));
            $post->loadMissing('author');
            $author = $post->author;

            $post->update([
                'moderation_status' => 'rejected',
                'approved_at' => null,
                'moderation_rejection_reason' => $reason !== '' ? $reason : null,
            ]);
            $post->delete();

            if ($author) {
                $this->userNotifications->notify(
                    $author,
                    UserNotificationType::PostDeleted,
                    [
                        'title' => $post->post_title ?: 'Без названия',
                        'post_id' => (string) $post->id,
                        'user_id' => (string) $author->id,
                        'reason' => $reason,
                    ],
                    new PostRemovedByAdminNotification(
                        $post,
                        'deleted',
                        $reason !== '' ? $reason : null,
                        now()
                    ),
                    ['post_id' => $post->id]
                );
            }
            $this->postReports->notifyReportersOnPostMeasures(
                $post,
                $request->user(),
                'публикация удалена за нарушение правил'
            );
            Log::info('Post deleted by admin for violation', ['post_id' => $post->id, 'reason' => $reason]);

            $days = \App\Support\ContentRetention::graceDays();

            return response()->json([
                'message' => "Публикация удалена. Восстановление доступно в течение {$days} дней.",
            ]);
        } catch (\Exception $e) {
            Log::error('Admin deletePost error: ' . $e->getMessage());
            return response()->json(['message' => 'Ошибка при удалении публикации'], 500);
        }
    }
    // Одобрить публикацию (показывать в ленте)
    public function approvePost($id): JsonResponse
    {
        try {
            $post = Post::withTrashed()->with('author')->findOrFail($id);

            if ($post->deleted_at) {
                return response()->json(['message' => 'Нельзя одобрить удаленную публикацию'], 422);
            }

            $post->update([
                'moderation_status' => 'approved',
                'approved_at' => now(),
                'moderation_rejection_reason' => null,
            ]);

            if ($post->author) {
                $this->userNotifications->notify(
                    $post->author,
                    UserNotificationType::PostApproved,
                    [
                        'title' => $post->post_title ?: 'Без названия',
                        'post_id' => (string) $post->id,
                        'user_id' => (string) $post->author->id,
                    ],
                    new PostApprovedNotification($post),
                    ['post_id' => $post->id]
                );
            }

            return response()->json(['message' => 'Публикация одобрена']);
        } catch (\Exception $e) {
            Log::error('Admin approvePost error: ' . $e->getMessage());
            return response()->json(['message' => 'Ошибка при одобрении публикации'], 500);
        }
    }
     // Восстановить публикацию
    
    public function restorePost($id): JsonResponse
    {
        try {
            $post = Post::withTrashed()->findOrFail($id);

            if (! $post->trashed()) {
                return response()->json(['message' => 'Публикация не удалена'], 422);
            }

            if (! \App\Support\ContentRetention::canRestore($post->deleted_at)) {
                return response()->json([
                    'message' => 'Срок восстановления истёк. Публикация будет удалена окончательно.',
                ], 422);
            }

            $post->restore();
            $post->load('author');

            if ($post->author) {
                $this->userNotifications->notify(
                    $post->author,
                    UserNotificationType::PostRestored,
                    [
                        'title' => $post->post_title ?: 'Без названия',
                        'post_id' => (string) $post->id,
                        'user_id' => (string) $post->author->id,
                    ],
                    new PostRestoredNotification($post->fresh()),
                    ['post_id' => $post->id]
                );
            }

            return response()->json(['message' => 'Публикация успешно восстановлена']);
        } catch (\Exception $e) {
            Log::error('Admin restorePost error: ' . $e->getMessage());
            return response()->json(['message' => 'Ошибка при восстановлении публикации'], 500);
        }
    }
    // Получить все комментарии (включая удаленные)
    public function getComments(Request $request): JsonResponse
    {
        try {
            $query = Comment::with([
                'author' => function($q) {
                    $q->withTrashed();
                },
                'post' => function($q) {
                    $q->withTrashed();
                }
            ])->withTrashed();
            
            // Фильтрация по статусу
            if ($request->has('status')) {
                switch ($request->status) {
                    case 'approved':
                        $query->where('comments.moderation_status', 'approved')
                              ->whereNull('comments.deleted_at');
                        break;
                    case 'deleted':
                        $query->whereNotNull('comments.deleted_at');
                        break;
                    case 'hidden':
                        $query->whereNotNull('comments.deleted_at')
                              ->where('comments.auto_moderation_passed', false);
                        break;
                }
            }

            // Поиск по содержимому
            if ($request->has('search')) {
                $search = $request->search;
                $query->where('comment_content', 'like', "%{$search}%");
            }
            
            $perPage = $this->clampPerPage($request);
            $comments = $query->orderBy('created_at', 'desc')->paginate($perPage);
            $comments->getCollection()->transform(function ($comment) {
                $comment->setAttribute('author_deleted', (bool) optional($comment->author)->deleted_at);
                return $comment;
            });
            
            return response()->json([
                'data' => $comments->items(),
                'current_page' => $comments->currentPage(),
                'last_page' => $comments->lastPage(),
                'per_page' => $comments->perPage(),
                'total' => $comments->total(),
            ]);
        } catch (\Exception $e) {
            Log::error('Admin getComments error: ' . $e->getMessage());
            return response()->json(['message' => 'Ошибка при загрузке комментариев'], 500);
        }
    }
    
    //Удалить комментарий (soft delete)
     
    public function deleteComment(Comment $comment): JsonResponse
    {
        try {
            $comment->loadMissing('author');
            $author = $comment->author;
            $post = $comment->post;

            if ($comment->moderation_status === 'approved' && $post && $post->comment_count > 0) {
                $post->decrement('comment_count');
            }

            $comment->delete();

            if ($author) {
                $comment->loadMissing('post');
                $this->userNotifications->notify(
                    $author,
                    UserNotificationType::CommentDeleted,
                    [
                        'delete_context' => 'Ваш комментарий удалён администратором.',
                        'title' => $comment->post?->post_title ?? 'Публикация',
                        'post_id' => (string) ($comment->post_id ?? ''),
                        'reason' => '',
                    ],
                    new CommentRemovedByAdminNotification($comment),
                    ['comment_id' => $comment->id, 'post_id' => $comment->post_id]
                );
                $this->userNotifications->notifyReportersJustified(
                    $comment,
                    \App\Support\CommentReportOutcomeText::MEASURE_COMMENT_DELETED
                );
            }
            
            return response()->json(['message' => 'Комментарий успешно удален']);
        } catch (\Exception $e) {
            Log::error('Admin deleteComment error: ' . $e->getMessage());
            return response()->json(['message' => 'Ошибка при удалении комментария'], 500);
        }
    }

    // Одобрить комментарий (публикация под постом)
    public function approveComment($id): JsonResponse
    {
        try {
            $comment = Comment::withTrashed()
                ->with([
                    'post' => function ($q) {
                        $q->withTrashed();
                    }
                ])
                ->findOrFail($id);

            if ($comment->deleted_at) {
                if ((bool) $comment->auto_moderation_passed === false) {
                    $comment->restore();
                } else {
                    return response()->json(['message' => 'Нельзя одобрить удаленный комментарий'], 422);
                }
            }

            $post = $comment->post;
            if (!$post || $post->deleted_at) {
                return response()->json(['message' => 'Публикация не найдена'], 404);
            }

            // Блокируем одобрение, если пост непубличен
            if ($post->is_draft) {
                return response()->json(['message' => 'Нельзя одобрить комментарий к непубличной публикации'], 422);
            }

            if (($post->moderation_status ?? '') !== 'approved') {
                return response()->json(['message' => 'Нельзя одобрить комментарий к публикации на модерации'], 422);
            }

            if ($post->published_at && $post->published_at->isFuture()) {
                return response()->json(['message' => 'Нельзя одобрить комментарий к публикации, запланированной на будущее'], 422);
            }

            if ($comment->moderation_status !== 'approved') {
                $comment->update([
                    'moderation_status' => 'approved',
                    'approved_at' => now(),
                ]);

                $post->increment('comment_count');
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
        } catch (\Exception $e) {
            Log::error('Admin approveComment error: ' . $e->getMessage());
            return response()->json(['message' => 'Ошибка при одобрении комментария'], 500);
        }
    }
    
    // Восстановить комментарий
 
    public function restoreComment($id): JsonResponse
    {
        try {
            $comment = Comment::withTrashed()
                ->with([
                    'post' => function ($q) {
                        $q->withTrashed();
                    }
                ])
                ->findOrFail($id);

            if (!$comment->trashed()) {
                return response()->json(['message' => 'Комментарий уже восстановлен']);
            }

            $post = $comment->post;
            $wasApproved = ($comment->moderation_status ?? '') === 'approved';

            $comment->restore();

            // Синхронизируем счетчик только для одобренных комментариев к активной публикации.
            if ($wasApproved && $post && !$post->trashed()) {
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
            
            return response()->json(['message' => 'Комментарий успешно восстановлен']);
        } catch (\Exception $e) {
            Log::error('Admin restoreComment error: ' . $e->getMessage());
            return response()->json(['message' => 'Ошибка при восстановлении комментария'], 500);
        }
    }

    //Генерация полного отчета о системе
    public function generateReport(Request $request)
    {
        try {
            $periodKey = (string) $request->input('period', 'all');
            [$from, $to] = ReportPeriodResolver::resolve($periodKey);
            $periodLabel = $this->reportPeriodLabelRu($periodKey);

            $usersQuery = User::withTrashed()->with('roles');
            $postsQuery = Post::withTrashed()
                ->with([
                    'author' => function ($q) {
                        $q->withTrashed();
                    },
                    'category:id,name',
                ])
                ->withCount(['likes', 'comments']);
            $commentsQuery = Comment::withTrashed()
                ->with([
                    'author' => function ($q) {
                        $q->withTrashed();
                    },
                    'post' => function ($q) {
                        $q->withTrashed();
                    },
                ]);

            if ($from && $to) {
                $usersQuery->whereBetween('created_at', [$from, $to]);
                $postsQuery->whereBetween('created_at', [$from, $to]);
                $commentsQuery->whereBetween('created_at', [$from, $to]);
            }

            $users = $usersQuery->get();
            $posts = $postsQuery->get();
            $comments = $commentsQuery->get();

            $stats = [
                'report_period' => $periodLabel,
                'period_is_filtered' => $from !== null,
                'period_from' => $from?->format('d.m.Y H:i'),
                'period_to' => $to?->format('d.m.Y H:i'),
                'total_users' => $users->count(),
                'active_users' => $users->whereNull('deleted_at')->count(),
                'deleted_users' => $users->whereNotNull('deleted_at')->count(),
                'banned_users' => $users->whereNull('deleted_at')->where('is_banned', true)->count(),
                'total_posts' => $posts->count(),
                'active_posts' => $posts->whereNull('deleted_at')->count(),
                'deleted_posts' => $posts->whereNotNull('deleted_at')->count(),
                'draft_posts' => $posts->whereNull('deleted_at')->where('is_draft', true)->count(),
                'pending_posts' => $posts->whereNull('deleted_at')->where('moderation_status', 'pending')->count(),
                'rejected_posts' => $posts->whereNull('deleted_at')->where('moderation_status', 'rejected')->count(),
                'approved_posts' => $posts->whereNull('deleted_at')->where('is_draft', false)->where('moderation_status', 'approved')->count(),
                'total_comments' => $comments->count(),
                'active_comments' => $comments->whereNull('deleted_at')->count(),
                'deleted_comments' => $comments->whereNotNull('deleted_at')->count(),
                'pending_comments' => $comments->whereNull('deleted_at')->where('moderation_status', 'pending')->count(),
                'rejected_comments' => $comments->whereNull('deleted_at')->where('moderation_status', 'rejected')->count(),
            ];

            $csv = (new AdminReportCsvBuilder())->build($stats, $users, $posts, $comments);

            $filename = 'отчет_' . $this->reportPeriodFilenamePart($periodKey) . '_' . now()->format('Y-m-d_H-i-s') . '.csv';

            return response($csv, 200)
                ->header('Content-Type', 'text/csv; charset=UTF-8')
                ->header('Content-Disposition', 'attachment; filename="' . $filename . '"');
                
        } catch (\Exception $e) {
            Log::error('Admin generateReport error: ' . $e->getMessage());
            return response()->json(['message' => 'Ошибка при генерации отчета'], 500);
        }
    }

    private function reportPeriodLabelRu(?string $period): string
    {
        $period = $period ? trim($period) : 'all';

        return match ($period) {
            'week' => 'За неделю',
            'month' => 'За месяц',
            'quarter' => 'За квартал',
            'year' => 'За год',
            default => 'За всё время',
        };
    }

    private function reportPeriodFilenamePart(?string $period): string
    {
        $period = $period ? trim($period) : 'all';

        return match ($period) {
            'week' => 'za-nedelyu',
            'month' => 'za-mesyac',
            'quarter' => 'za-kvartal',
            'year' => 'za-god',
            default => 'za-vse-vremya',
        };
    }

    /**
     * @return array{0: ?Carbon, 1: ?Carbon}
     */
}