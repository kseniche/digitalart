<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Критерий 3.6: заблокированный пользователь не может создавать посты, комментировать, ставить лайки.
 */
class CheckIfNotBanned
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user && $user->is_banned) {
            $message = 'Ваш аккаунт заблокирован';
            if (!empty($user->ban_reason)) {
                $message .= '. Причина: ' . $user->ban_reason;
            }

            return response()->json([
                'message' => $message,
                'ban_reason' => $user->ban_reason,
            ], 403);
        }

        return $next($request);
    }
}
