<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Services\AutoModerationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class PostController extends Controller
{
    public function __construct(
        private readonly AutoModerationService $autoModerationService
    ) {}

    private function hasPostColumn(string $column): bool
    {
        return Schema::hasColumn('posts', $column);
    }

    public function index(Request $request)
    {
        // Список публикаций (для ленты/каталогов)
        try {
            $query = Post::with(['author:id,name,user_surname,avatar']);

            // Исключаем посты удаленных пользователей
            $query->whereHas('author', function($q) {
                $q->whereNull('users.deleted_at');
            });

            $search = (string) $request->query('q', '');
            if ($search !== '') {
                $query->where(function ($q) use ($search) {
                    $q->where('post_title', 'like', "%{$search}%")
                        ->orWhere('tags', 'like', "%{$search}%");
                });
            }

            $sort = (string) $request->query('sort', '');
            if (in_array($sort, ['popular', 'likes'], true)) {
                $query->orderByDesc('like_count');
            } elseif (in_array($sort, ['new', 'newest', 'created_at'], true)) {
                $query->orderByDesc('created_at');
            } else {
                $query->orderByDesc('created_at');
            }

            $perPage = (int) $request->query('per_page', 12);
            $perPage = $perPage > 0 && $perPage <= 1000 ? $perPage : 12;

            $posts = $query->paginate($perPage);
            if ($request->user()) {
                $userId = $request->user()->id;
                $postIds = $posts->getCollection()->pluck('id')->all();
                $likedPostIds = [];
                if (count($postIds) > 0) {
                    $likedPostIds = \App\Models\Like::query()
                        ->where('user_id', $userId)
                        ->whereIn('post_id', $postIds)
                        ->whereNull('deleted_at')
                        ->pluck('post_id')
                        ->flip()
                        ->all();
                }
                $posts->getCollection()->transform(function ($post) use ($likedPostIds) {
                    $post->setAttribute('liked', isset($likedPostIds[$post->id]));
                    return $post;
                });
            }
    
            return $posts;

        } catch (\Throwable $e) {
            Log::error('Ошибка при получении списка публикаций', [
                'error' => $e->getMessage(),
                'q' => $request->query('q'),
                'sort' => $request->query('sort'),
                'per_page' => $request->query('per_page'),
            ]);
            return response()->json(['message' => 'Не удалось получить публикации'], 500);
        }
    }

    private function resolveMediaDisk(): string
    {
        if (app()->environment('testing')) {
            return 'public';
        }

        $key = (string) config('filesystems.disks.s3.key');
        $bucket = (string) config('filesystems.disks.s3.bucket');

        return ($key !== '' && $bucket !== '') ? 's3' : 'public';
    }

    public function store(Request $request)
{
    $imagePath = null;
    
    try {
        if ($request->has('is_draft')) {
            $request->merge([
                'is_draft' => filter_var($request->input('is_draft'), FILTER_VALIDATE_BOOLEAN),
            ]);
        }

        Log::info('Начало создания поста', [
            'user_id' => $request->user()->id,
            'request_data' => $request->except(['media_file']),
            'has_media_file' => $request->hasFile('media_file')
        ]);

        $validationMessages = [
            'title.required' => 'Укажите название работы.',
            'description.required' => 'Укажите описание работы.',
            'category_id.required' => 'Выберите категорию.',
            'category_id.exists' => 'Выбранная категория не найдена.',
            'media_type.required' => 'Укажите тип медиа.',
            'media_type.in' => 'Недопустимый тип медиа.',
            'media_file.required' => 'Выберите файл для загрузки.',
            'media_file.file' => 'Загруженный файл недопустим.',
            'media_file.uploaded' => 'Файл загружен некорректно. Попробуйте другой файл или уменьшите размер (до 50 МБ).',
            'media_file.max' => 'Размер файла не должен превышать 50 МБ.',
            'is_draft.boolean' => 'Некорректный признак черновика.',
        ];

        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'tags' => 'nullable|string',
            'category_id' => 'required|exists:categories,id',
            'is_draft' => 'sometimes|boolean',
            'published_at' => 'nullable|date',
            'media_type' => 'required|string|in:image,video',
            'media_file' => [
                'required',
                'file',
                'max:51200',
                function (string $attribute, mixed $value, \Closure $fail) use ($request) {
                    if (!$value instanceof \Illuminate\Http\UploadedFile) {
                        $fail('Файл не загружен.');
                        return;
                    }

                    $mediaType = (string) $request->input('media_type', 'image');
                    $mime = (string) $value->getMimeType();
                    $imageMimes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
                    $videoMimes = ['video/mp4', 'video/webm', 'video/quicktime'];

                    if ($mediaType === 'image' && !in_array($mime, $imageMimes, true)) {
                        $fail('Для media_type=image допустимы только изображения JPEG, PNG, JPG, GIF, WebP.');
                    }

                    if ($mediaType === 'video' && !in_array($mime, $videoMimes, true)) {
                        $fail('Для media_type=video допустимы только видео MP4, WebM, MOV.');
                    }
                },
            ],
        ], $validationMessages);

        $mediaDisk = $this->resolveMediaDisk();

        $filename = time().'_'.uniqid().'.'.$request->file('media_file')->getClientOriginalExtension();

        $uploaded = Storage::disk($mediaDisk)->putFileAs(
            'posts',
            $request->file('media_file'),
            $filename,
            ['visibility' => 'public']
        );

        if ($uploaded === false) {
            Log::error('Не удалось сохранить media_file', ['disk' => $mediaDisk]);

            return response()->json(['message' => 'Не удалось сохранить файл'], 500);
        }

        if ($mediaDisk === 's3') {
            try {
                Storage::disk('s3')->setVisibility($uploaded, 'public');
                Log::info('Права доступа установлены для файла', ['file_path' => $uploaded]);
            } catch (\Exception $e) {
                Log::warning('Не удалось установить права доступа для файла', [
                    'file_path' => $uploaded,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $imagePath = $uploaded;

        // Теги: в модели Post поле `tags` приведено к cast array — в create передаём массив.
        $tagsRaw = $data['tags'] ?? '';
        $tagsForModel = is_string($tagsRaw)
            ? array_values(array_filter(array_map('trim', explode(',', $tagsRaw)), fn (string $t) => $t !== ''))
            : [];

        $isDraft = !empty($data['is_draft']);
        $publishedAt = null;
        if (!$isDraft && !empty($data['published_at'])) {
            $dt = \Carbon\Carbon::parse($data['published_at']);
            if ($dt->isFuture()) {
                $publishedAt = $dt;
            }
        }

        $autoModeration = $this->autoModerationService->checkPost(
            (string) $data['title'],
            (string) $data['description'],
            $tagsForModel
        );

        $moderationStatus = $isDraft
            ? 'pending'
            : ($autoModeration['passed'] ? 'pending' : 'rejected');
        $moderationReason = !$autoModeration['passed']
            ? ($autoModeration['reason'] ?? 'Нарушение правил сообщества.')
            : null;

        $createPayload = [
            'post_title' => $data['title'],
            'post_content' => $data['description'],
            'tags' => $tagsForModel,
            'category_id' => $data['category_id'],
            'is_draft' => $isDraft,
            'published_at' => $publishedAt,
            'moderation_status' => $moderationStatus,
            'approved_at' => null,
            'media_type' => $data['media_type'],
            'user_id' => $request->user()->id, 
            'like_count' => 0,
            'comment_count' => 0,
            'media_path' => $imagePath,
        ];

        if ($this->hasPostColumn('moderation_rejection_reason')) {
            $createPayload['moderation_rejection_reason'] = $moderationReason;
        }
        if ($this->hasPostColumn('auto_moderation_passed')) {
            $createPayload['auto_moderation_passed'] = (bool) $autoModeration['passed'];
        }
        if ($this->hasPostColumn('auto_moderation_reason')) {
            $createPayload['auto_moderation_reason'] = $moderationReason;
        }
        if ($this->hasPostColumn('auto_moderation_checked_at')) {
            $createPayload['auto_moderation_checked_at'] = now();
        }

        $post = Post::create($createPayload);

        Log::info('Пост создан успешно', [
            'post_id' => $post->id, 
            'final_media_path' => $post->media_path,
            'final_image_url' => $post->image_url
        ]);

        return response()->json([
            'message' => $isDraft
                ? 'Черновик сохранен'
                : (
                    !$autoModeration['passed']
                        ? 'Публикация автоматически отклонена: обнаружены запрещенные слова. Исправьте текст и отправьте повторно.'
                        : 'Публикация отправлена на модерацию'
                ),
            'id' => $post->id, 
            'post' => $post
        ], 201);

    } catch (\Illuminate\Validation\ValidationException $e) {
        throw $e;
    } catch (\Throwable $e) {
        Log::error('Ошибка при создании поста', [
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
        ]);

        return response()->json([
            'message' => 'Не удалось создать публикацию',
            'error' => config('app.debug') ? $e->getMessage() : null,
        ], 500);
    }
}

public function show($id, Request $request)
{
    try {
        // используем стандартный id
        $post = Post::where('id', $id)
            ->whereHas('author', function($q) {
                $q->whereNull('users.deleted_at');
            })
            ->firstOrFail();

        // Публичный маршрут: автор видит черновики и запланированные посты, остальные — только опубликованные
        $currentUser = $request->user() ?? ($request->bearerToken() ? auth('sanctum')->user() : null);
        $isAuthor = $currentUser && $currentUser->id === $post->user_id;
        if (!$isAuthor) {
            if ($post->is_draft) {
                abort(404);
            }
            if ($post->moderation_status !== 'approved') {
                abort(404);
            }
            if ($post->published_at && $post->published_at->isFuture()) {
                abort(404);
            }
        }

        $isRejectedAuthorView = $isAuthor && (($post->moderation_status ?? '') === 'rejected');

        if ($isRejectedAuthorView) {
            $post->setRelation('comments', collect());
        } else {
            $commentsSort = $request->input('comments_sort', 'new');
            $commentsQuery = \App\Models\Comment::where('post_id', $post->id)
                ->where('moderation_status', 'approved')
                ->whereHas('author', fn ($q) => $q->whereNull('users.deleted_at'))
                ->with(['author:id,name,user_surname,avatar'])
                ->withCount('likes as likes_count');
            if ($commentsSort === 'popular') {
                $commentsQuery->orderByDesc('likes_count');
            } else {
                $commentsQuery->orderByDesc('created_at');
            }
            $comments = $commentsQuery->get();
            $post->setRelation('comments', $comments);

            $likedCommentIds = [];
            $commentIds = $comments->pluck('id')->all();
            if ($currentUser && count($commentIds) > 0) {
                $likedCommentIds = \Illuminate\Support\Facades\DB::table('comment_likes')
                    ->where('user_id', $currentUser->id)
                    ->whereIn('comment_id', $commentIds)
                    ->pluck('comment_id')
                    ->flip()
                    ->all();
            }

            $post->comments->transform(function ($comment) use ($likedCommentIds) {
                if ($comment->author) {
                    $comment->author_name = $comment->author->name . ' ' . ($comment->author->user_surname ?? '');
                } else {
                    $comment->author_name = 'Неизвестный автор';
                }
                $comment->is_liked = isset($likedCommentIds[$comment->id]);

                return $comment;
            });
        }

        $post->load(['author:id,name,user_surname,avatar', 'category:id,name']);
        if ($currentUser) {
            if ($isRejectedAuthorView) {
                $post->setAttribute('liked', false);
                $post->setAttribute('is_favorited', false);
            } else {
                $userId = $currentUser->id;
                $post->setAttribute('liked', \App\Models\Like::where('user_id', $userId)
                    ->where('post_id', $post->id)
                    ->whereNull('deleted_at')
                    ->exists());
                $post->setAttribute('is_favorited', $currentUser->favorites()->where('post_id', $post->id)->exists());
            }
        }
        $post->setAttribute('category', $post->category?->name);
        $post->setAttribute('post_content_html', \App\Helpers\MarkdownHelper::toSafeHtml($post->post_content));
        if (! $isRejectedAuthorView) {
            $post->increment('view_count');
        }

        return response()->json($post);
    } catch (HttpException $e) {
        throw $e;
    } catch (ModelNotFoundException $e) {
        return response()->json(['message' => 'Публикация не найдена'], 404);
    } catch (\Throwable $e) {
        Log::error('Ошибка при получении поста', [
            'requested_id' => $id,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
        ]);
        return response()->json(['message' => 'Не удалось загрузить пост'], 500);
    }
}
   
public function update(Request $request, Post $post)
{
    $user = $request->user();
    $isOwner = $post->user_id === $user->id;
    
    // Проверка прав - только владелец поста может редактировать (админ не может редактировать чужие посты)
    if (!$isOwner) {
        return response()->json(['message' => 'Недостаточно прав. Вы можете редактировать только свои публикации.'], 403);
    }

    $data = $request->validate([
        'title' => 'sometimes|string|max:255',
        'description' => 'sometimes|string',
        'tags' => 'sometimes|string',
        'category_id' => 'sometimes|exists:categories,id',
        'is_draft' => 'sometimes|boolean',
        'published_at' => 'nullable|date',
    ]);

    $isPublishedLocked = !$post->is_draft && $post->moderation_status === 'approved';

    if ($isPublishedLocked) {
        if (array_key_exists('is_draft', $data) && (bool) $data['is_draft'] !== (bool) $post->is_draft) {
            return response()->json([
                'message' => 'Опубликованную публикацию нельзя перевести в черновик.',
                'errors' => ['is_draft' => ['Опубликованную публикацию нельзя перевести в черновик.']],
            ], 422);
        }
        if ($request->has('published_at')) {
            $requestedAt = empty($data['published_at'] ?? null)
                ? null
                : \Carbon\Carbon::parse($data['published_at'])->toIso8601String();
            $currentAt = $post->published_at?->toIso8601String();
            if ($requestedAt !== $currentAt) {
                return response()->json([
                    'message' => 'Дату и режим публикации опубликованной работы изменить нельзя.',
                    'errors' => ['published_at' => ['Дату публикации опубликованной работы изменить нельзя.']],
                ], 422);
            }
        }
    }

    $publishedAt = $post->published_at;
    $isDraft = $isPublishedLocked
        ? false
        : (array_key_exists('is_draft', $data) ? (bool) $data['is_draft'] : $post->is_draft);
    if ($isPublishedLocked) {
        $publishedAt = $post->published_at;
    } elseif ($isDraft) {
        $publishedAt = null;
    } elseif (array_key_exists('published_at', $data)) {
        if (empty($data['published_at'])) {
            $publishedAt = null;
        } else {
            $dt = \Carbon\Carbon::parse($data['published_at']);
            $publishedAt = $dt->isFuture() ? $dt : null;
        }
    }

    try {
        $nextModerationStatus = $post->moderation_status;
        $nextApprovedAt = $post->approved_at;
        $normalizedTags = $post->tags;
        if (array_key_exists('tags', $data)) {
            $tagsRaw = $data['tags'] ?? '';
            $normalizedTags = is_string($tagsRaw)
                ? array_values(array_filter(array_map('trim', explode(',', $tagsRaw)), fn (string $t) => $t !== ''))
                : [];
        }
        $isResubmission = !$isDraft;
        $autoModeration = null;

        if ($isResubmission) {
            $nextTitle = $data['title'] ?? $post->post_title;
            $nextContent = $data['description'] ?? $post->post_content;
            $autoModeration = $this->autoModerationService->checkPost(
                (string) $nextTitle,
                (string) $nextContent,
                is_array($normalizedTags) ? $normalizedTags : []
            );
            $nextModerationStatus = $autoModeration['passed'] ? 'pending' : 'rejected';
            $nextApprovedAt = null;
        }

        $updatePayload = [
            'post_title' => $data['title'] ?? $post->post_title,
            'post_content' => $data['description'] ?? $post->post_content,
            'tags' => $normalizedTags,
            'category_id' => array_key_exists('category_id', $data) ? $data['category_id'] : $post->category_id,
            'is_draft' => $isDraft,
            'published_at' => $publishedAt,
            'moderation_status' => $nextModerationStatus,
            'approved_at' => $nextApprovedAt,
        ];

        if ($this->hasPostColumn('moderation_rejection_reason')) {
            $updatePayload['moderation_rejection_reason'] = $isResubmission
                ? ($autoModeration['passed'] ? null : ($autoModeration['reason'] ?? 'Нарушение правил сообщества.'))
                : ($nextModerationStatus === 'pending' ? null : $post->moderation_rejection_reason);
        }
        if ($this->hasPostColumn('auto_moderation_passed')) {
            $updatePayload['auto_moderation_passed'] = $isResubmission ? (bool) $autoModeration['passed'] : $post->auto_moderation_passed;
        }
        if ($this->hasPostColumn('auto_moderation_reason')) {
            $updatePayload['auto_moderation_reason'] = $isResubmission
                ? ($autoModeration['passed'] ? null : ($autoModeration['reason'] ?? 'Нарушение правил сообщества.'))
                : $post->auto_moderation_reason;
        }
        if ($this->hasPostColumn('auto_moderation_checked_at')) {
            $updatePayload['auto_moderation_checked_at'] = $isResubmission ? now() : $post->auto_moderation_checked_at;
        }

        $post->update($updatePayload);

        return response()->json([
            'message' => $isResubmission && $autoModeration && !$autoModeration['passed']
                ? 'Публикация отклонена автомодерацией. Исправьте текст и отправьте снова.'
                : 'Публикация обновлена',
            'post' => $post
        ]);

    } catch (\Throwable $e) {
        Log::error('Ошибка при обновлении поста', [
            'post_id' => $post->id,
            'error' => $e->getMessage(),
        ]);
        return response()->json(['message' => 'Не удалось обновить пост'], 500);
    }
}
    public function destroy(Post $post, Request $request)
    {
        try {
            $user = $request->user();
            $isAdmin = $user->hasRole('admin');
            $isOwner = $post->user_id === $user->id;

            // Проверяем права: владелец может удалить свой пост, админ - любой пост
            if (!$isOwner && !$isAdmin) {
                return response()->json(['message' => 'Недостаточно прав. Вы можете удалять только свои публикации.'], 403);
            }

            // Если это администратор удаляет чужой пост - используем мягкое удаление
            if ($isAdmin && !$isOwner) {
                $post->delete(); // Мягкое удаление для восстановления админом
                
                Log::info('Пост удален администратором (мягкое удаление)', [
                    'post_id' => $post->id,
                    'admin_id' => $user->id,
                    'post_owner_id' => $post->user_id,
                ]);
                
                return response()->json([
                    'message' => 'Публикация успешно удалена'
                ], 200);
            }

            // Если владелец удаляет свой пост - безвозвратное удаление
            // Удаляем изображение из S3
            if ($post->media_path && !str_starts_with($post->media_path, 'http')) {
                try {
                    Storage::disk('s3')->delete($post->media_path);
                    Log::info('Изображение поста удалено из S3', [
                        'post_id' => $post->id,
                        'media_path' => $post->media_path,
                    ]);
                } catch (\Exception $e) {
                    Log::warning('Не удалось удалить изображение поста из S3', [
                        'post_id' => $post->id,
                        'media_path' => $post->media_path,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            // Удаляем все комментарии и лайки поста (безвозвратно)
            \App\Models\Comment::where('post_id', $post->id)->forceDelete();
            \App\Models\Like::where('post_id', $post->id)->forceDelete();

            // Безвозвратно удаляем сам пост
            $post->forceDelete();
            
            Log::info('Пост безвозвратно удален владельцем', [
                'post_id' => $post->id,
                'user_id' => $user->id,
            ]);
            
            return response()->json([
                'message' => 'Публикация успешно удалена'
            ], 200);

        } catch (\Throwable $e) {
            Log::error('Ошибка при удалении публикации', [
                'post_id' => $post->id,
                'user_id' => optional($request->user())->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['message' => 'Не удалось удалить публикацию'], 500);
        }
    }
}