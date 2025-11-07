<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Log;

class PostController extends Controller
{
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
                $posts->getCollection()->transform(function ($post) use ($userId) {
                    // Проверяем только активные лайки (без мягко удаленных)
                    $post->setAttribute('liked', \App\Models\Like::where('user_id', $userId)
                        ->where('post_id', $post->id)
                        ->whereNull('deleted_at')
                        ->exists());
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

    public function store(Request $request)
{
    $imagePath = null;
    
    try {
        Log::info('Начало создания поста', [
            'user_id' => $request->user()->id,
            'request_data' => $request->except(['media_file']),
            'has_media_file' => $request->hasFile('media_file')
        ]);

        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'tags' => 'nullable|string',
            'media_file' => 'required|file|image|mimes:jpeg,png,jpg,gif,webp|max:10240',
            'media_type' => 'required|string|in:image,video'
        ]);

        // Загрузка в S3
        $filename = time() . '_' . uniqid() . '.' . $request->file('media_file')->getClientOriginalExtension();
        $imagePath = 'posts/' . $filename;
        
        $uploaded = Storage::disk('s3')->putFileAs(
            'posts',
            $request->file('media_file'),
            $filename,
            ['visibility' => 'public']
        );
        
        try {
            Storage::disk('s3')->setVisibility($uploaded, 'public');
            Log::info('Права доступа установлены для файла', ['file_path' => $uploaded]);
        } catch (\Exception $e) {
            Log::warning('Не удалось установить права доступа для файла', [
                'file_path' => $uploaded,
                'error' => $e->getMessage()
            ]);
        }
        
        $imagePath = $uploaded;

        // Преобразуем теги
        $tags = $data['tags'] ?? '';
        if (is_string($tags)) {
            $tagsArray = array_map('trim', explode(',', $tags));
            $tags = implode(',', $tagsArray);
        }

        // используем правильное имя поля
        $post = Post::create([
            'post_title' => $data['title'],
            'post_content' => $data['description'],
            'tags' => $tags,
            'media_type' => $data['media_type'],
            'user_id' => $request->user()->id, 
            'like_count' => 0,
            'comment_count' => 0,
            'media_path' => $imagePath,
        ]);

        Log::info('Пост создан успешно', [
            'post_id' => $post->id, 
            'final_media_path' => $post->media_path,
            'final_image_url' => $post->image_url
        ]);

        return response()->json([
            'message' => 'Пост успешно создан',
            'id' => $post->id, 
            'post' => $post
        ], 201);

    } catch (\Illuminate\Validation\ValidationException $e) {
    
    } catch (\Throwable $e) {
        
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

        $post->load([
            'author:id,name,user_surname,avatar',
            'likes',
            'comments' => function ($q) {
                $q->whereHas('author', function($q) {
                    $q->whereNull('users.deleted_at');
                })->with(['author:id,name,user_surname,avatar']);
            }
        ]);
        $post->comments->transform(function ($comment) {
            // Убедимся, что автор - это объект с нужными полями
            if ($comment->author) {
                $comment->author_name = $comment->author->name . ' ' . ($comment->author->user_surname ?? '');
            } else {
                $comment->author_name = 'Неизвестный автор';
            }
            return $comment;
        });
        // Добавляем флаг liked для текущего пользователя (проверяем только активные лайки)
        if ($request->user()) {
            $userId = $request->user()->id;
            // Проверяем только активные лайки (без мягко удаленных)
            $post->setAttribute('liked', \App\Models\Like::where('user_id', $userId)
                ->where('post_id', $post->id)
                ->whereNull('deleted_at')
                ->exists());
        }
        return response()->json($post);
    } catch (\Throwable $e) {
        Log::error('Ошибка при получении поста', [
            'requested_id' => $id,
            'error' => $e->getMessage(),
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
    ]);

    try {
        $post->update([
            'post_title' => $data['title'] ?? $post->post_title,
            'post_content' => $data['description'] ?? $post->post_content,
            'tags' => $data['tags'] ?? $post->tags,
        ]);

        return response()->json([
            'message' => 'Публикация обновлена',
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