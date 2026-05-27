<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * Опциональная аутентификация Sanctum: если в запросе есть Bearer-токен,
 * подставляем пользователя в $request->user(), не требуя обязательного входа.
 * Используется для публичных маршрутов, чтобы автор мог открыть свой черновик.
 */
class OptionalSanctum
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();
        if ($token) {
            $accessToken = PersonalAccessToken::findToken($token);
            if ($accessToken && $this->isAccessTokenValid($accessToken)) {
                $request->setUserResolver(fn () => $accessToken->tokenable);
            }
        }

        return $next($request);
    }

    /**
     * Та же логика проверки срока действия, что у Guard Sanctum (config/sanctum.php expiration).
     */
    private function isAccessTokenValid(PersonalAccessToken $accessToken): bool
    {
        $expiration = config('sanctum.expiration');

        if ($expiration !== null && $accessToken->created_at->lte(now()->subMinutes($expiration))) {
            return false;
        }

        if ($accessToken->expires_at?->isPast()) {
            return false;
        }

        return true;
    }
}
