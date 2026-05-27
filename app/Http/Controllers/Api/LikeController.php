<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Like;
use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LikeController extends Controller
{
    public function toggle(Request $request, Post $post)
    {
        $userId = $request->user()->id;

        try {
            $liked = DB::transaction(function () use ($userId, $post) {
                $existing = Like::withTrashed()
                    ->where('user_id', $userId)
                    ->where('post_id', $post->id)
                    ->lockForUpdate()
                    ->first();

                $addingLike = !$existing || $existing->trashed();
                if ($addingLike && !$post->isPubliclyVisible()) {
                    return null;
                }

                if ($existing) {
                    if ($existing->trashed()) {
                        $existing->restore();
                        $post->increment('like_count');
                        return true;
                    }

                    $existing->delete();
                    if ($post->like_count > 0) {
                        $post->decrement('like_count');
                    }
                    return false;
                }

                Like::create([
                    'user_id' => $userId,
                    'post_id' => $post->id,
                ]);
                $post->increment('like_count');
                return true;
            });

            if ($liked === null) {
                return response()->json(['message' => 'Публикация недоступна'], 404);
            }

            $updatedPost = $post->fresh();

            return response()->json([
                'liked' => $liked,
                'like_count' => $updatedPost->like_count,
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
