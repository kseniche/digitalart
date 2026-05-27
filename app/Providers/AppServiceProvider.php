<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Queue\Events\JobFailed;
use Illuminate\Support\Facades\App;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Регистрация сервисов приложения
     */
    public function register(): void
    {
        //
    }

    /**
     * Загрузка сервисов приложения
     */
    public function boot(): void
    {
        App::setLocale(config('app.locale', 'ru'));

        RateLimiter::for('auth-login', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        RateLimiter::for('auth-register', function (Request $request) {
            return Limit::perMinute(3)->by($request->ip());
        });

        RateLimiter::for('auth-password', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        RateLimiter::for('content-create', function (Request $request) {
            return Limit::perMinute(20)->by((string) optional($request->user())->id ?: $request->ip());
        });

        RateLimiter::for('social-actions', function (Request $request) {
            return Limit::perMinute(60)->by((string) optional($request->user())->id ?: $request->ip());
        });

        RateLimiter::for('admin-actions', function (Request $request) {
            return Limit::perMinute(40)->by((string) optional($request->user())->id ?: $request->ip());
        });

        // Логирование ошибок очереди, чтобы ошибки рассылки не терялись
        Event::listen(JobFailed::class, function (JobFailed $event) {
            Log::error('Queue job failed', [
                'connection' => $event->connectionName,
                'queue' => $event->job->getQueue(),
                'payload' => $event->job->getRawBody(),
                'exception' => $event->exception->getMessage(),
                'trace' => $event->exception->getTraceAsString(),
            ]);
        });
    }
}
