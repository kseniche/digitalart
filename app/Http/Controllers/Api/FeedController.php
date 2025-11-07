<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class FeedController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = Post::with(['author:id,name,user_surname,avatar']);

            // Исключаем посты удаленных пользователей
            $query->whereHas('author', function($q) {
                $q->whereNull('users.deleted_at');
            });

            if ($search = $request->input('q')) {
                $query->where(function ($q) use ($search) {
                    $q->where('post_title', 'like', "%{$search}%")
                      ->orWhere('tags', 'like', "%{$search}%");
                });
            }

            if ($sort = $request->input('sort')) {
                if ($sort === 'popular') {
                    $query->orderByDesc('like_count');
                } elseif ($sort === 'new') {
                    $query->orderByDesc('created_at');
                }
            } else {
                $query->orderByDesc('created_at');
            }

            $paginated = $query->paginate(12);

            // Добавляем флаг liked и обрабатываем image_url для S3
            if ($request->user()) {
                $userId = $request->user()->id;
                $paginated->getCollection()->transform(function ($post) use ($userId) {
                    // Проверяем только активные лайки (без мягко удаленных)
                    $post->setAttribute('liked', \App\Models\Like::where('user_id', $userId)
                        ->where('post_id', $post->id)
                        ->whereNull('deleted_at')
                        ->exists());
                    return $post;
                });
            }
    
            return $paginated;
        } catch (\Throwable $e) {
            Log::error('Ошибка при получении ленты работ', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'q' => $request->query('q'),
                'sort' => $request->query('sort'),
            ]);
            return response()->json(['message' => 'Не удалось загрузить ленту'], 500);
        }
    }
}