<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Follower;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class FollowController extends Controller
{
    public function toggle(Request $request, User $user)
    {
        // Подписка/отписка на пользователя
        $authId = $request->user()->id;
        if ($authId === $user->id) {
            return response()->json(['message' => 'Нельзя подписаться на себя'], 422);
        }

        try {
            // Проверяем существование подписки с учетом мягко удаленных записей
            $existing = Follower::withTrashed()
                ->where('follower_id', $authId)
                ->where('following_id', $user->id)
                ->first();

            if ($existing) {
                if ($existing->trashed()) {
                    // Подписка была удалена - восстанавливаем ее
                    $existing->restore();
                    return response()->json(['following' => true]);
                } else {
                    // Подписка активна - удаляем ее
                    $existing->delete();
                    return response()->json(['following' => false]);
                }
            } else {
                // Подписки не существует - создаем новую
                Follower::create([
                    'follower_id' => $authId,
                    'following_id' => $user->id,
                ]);
                return response()->json(['following' => true]);
            }
        } catch (\Throwable $e) {
            Log::error('Ошибка при подписке/отписке', [
                'auth_id' => $authId,
                'target_user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['message' => 'Не удалось выполнить действие подписки'], 500);
        }
    }
    
public function check(Request $request, User $user)
{
    // Проверяем только активные подписки (без мягко удаленных)
    $isFollowing = Follower::where('follower_id', $request->user()->id)
        ->where('following_id', $user->id)
        ->whereNull('deleted_at')
        ->exists();

    return response()->json(['following' => $isFollowing]);
}
}


