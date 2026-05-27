<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Follower;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
            $following = DB::transaction(function () use ($authId, $user) {
                $existing = Follower::withTrashed()
                    ->where('follower_id', $authId)
                    ->where('following_id', $user->id)
                    ->lockForUpdate()
                    ->first();

                if ($existing) {
                    if ($existing->trashed()) {
                        $existing->restore();
                        return true;
                    }

                    $existing->delete();
                    return false;
                }

                Follower::create([
                    'follower_id' => $authId,
                    'following_id' => $user->id,
                ]);
                return true;
            });

            return response()->json(['following' => $following]);
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
        $isFollowing = Follower::where('follower_id', $request->user()->id)
            ->where('following_id', $user->id)
            ->whereNull('deleted_at')
            ->exists();

        return response()->json(['following' => $isFollowing]);
    }

    /**
     * Список подписчиков пользователя (кто подписан на него).
     * GET /api/users/{user}/followers
     */
    public function followers(Request $request, User $user)
    {
        $authUser = $request->user();
        $rows = Follower::where('following_id', $user->id)
            ->whereNull('followers.deleted_at')
            ->with('follower:id,name,user_surname,username,avatar')
            ->get();

        $list = $rows->map(function ($row) use ($authUser) {
            $u = $row->follower;
            if (!$u) return null;
            $u->setAttribute('avatar_url', $u->avatar_url ?? null);
            $isFollowing = $authUser && $authUser->id !== $u->id
                ? Follower::where('follower_id', $authUser->id)->where('following_id', $u->id)->whereNull('deleted_at')->exists()
                : false;
            return [
                'id' => $u->id,
                'name' => trim($u->name . ' ' . ($u->user_surname ?? '')),
                'username' => $u->username,
                'avatar' => $u->avatar_url ?? $u->avatar,
                'is_following' => $isFollowing,
            ];
        })->filter()->values();

        return response()->json($list);
    }

    /**
     * Список подписок пользователя (на кого он подписан).
     * GET /api/users/{user}/following
     */
    public function following(Request $request, User $user)
    {
        $authUser = $request->user();
        $rows = Follower::where('follower_id', $user->id)
            ->whereNull('followers.deleted_at')
            ->with('following:id,name,user_surname,username,avatar')
            ->get();

        $list = $rows->map(function ($row) use ($authUser) {
            $u = $row->following;
            if (!$u) return null;
            $u->setAttribute('avatar_url', $u->avatar_url ?? null);
            $isFollowing = $authUser && $authUser->id !== $u->id
                ? Follower::where('follower_id', $authUser->id)->where('following_id', $u->id)->whereNull('deleted_at')->exists()
                : false;
            return [
                'id' => $u->id,
                'name' => trim($u->name . ' ' . ($u->user_surname ?? '')),
                'username' => $u->username,
                'avatar' => $u->avatar_url ?? $u->avatar,
                'is_following' => $isFollowing,
            ];
        })->filter()->values();

        return response()->json($list);
    }
}


