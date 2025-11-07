<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Like;
use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class LikeController extends Controller
{
    public function toggle(Request $request, Post $post)
{
    // Переключение лайка публикации текущим пользователем
    $userId = $request->user()->id;

    try {
        // Проверяем существование лайка с учетом мягко удаленных записей
        $existing = Like::withTrashed()
            ->where('user_id', $userId)
            ->where('post_id', $post->id)
            ->first();

        if ($existing) {
            if ($existing->trashed()) {
                // Лайк был удален - восстанавливаем его
                $existing->restore();
                $post->increment('like_count');
                $liked = true;
            } else {
                // Лайк активен - удаляем его
                $existing->delete();
                $post->decrement('like_count');
                $liked = false;
            }
        } else {
            // Лайка не существует - создаем новый
            Like::create([
                'user_id' => $userId,
                'post_id' => $post->id,
            ]);
            $post->increment('like_count');
            $liked = true;
        }

        //  возвращаем актуальный счетчик лайков
        $updatedPost = $post->fresh();

        return response()->json([
            'liked' => $liked,
            'like_count' => $updatedPost->like_count
        ]);
    } catch (\Throwable $e) {
        Log::error('Ошибка при переключении лайка', [
            'post_id' => $post->id,
            'user_id' => $userId,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
        ]);
        return response()->json(['message' => 'Не удалось выполнить действие с лайком'], 500);
    }
}
}


