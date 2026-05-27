<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        //  Убедитесь что CORS настроен для React фронтенда
        $middleware->api(prepend: [
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
        ]);

        // CSP для защиты от XSS (критерий 2.2.9)
        $middleware->append(\App\Http\Middleware\ContentSecurityPolicy::class);

        $middleware->alias([
            'optional_sanctum' => \App\Http\Middleware\OptionalSanctum::class,
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
            'admin' => \App\Http\Middleware\AdminMiddleware::class,
            'not_banned' => \App\Http\Middleware\CheckIfNotBanned::class,
        ]);

        // CSRF для SPA: API не исключаем — запросы с stateful-доменов проходят через cookie + X-XSRF-TOKEN.
        // Маршрут GET /sanctum/csrf-cookie (Sanctum) доступен без авторизации и выставляет cookie.
        $middleware->validateCsrfTokens(except: []);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
      
        $exceptions->report(function (Throwable $e) {
            if (str_contains($e->getMessage(), 'S3') || 
                str_contains($e->getMessage(), 'AWS') ||
                str_contains($e->getMessage(), 'Selectel')) {
                \Log::error('S3 Storage Error: ' . $e->getMessage(), [
                    'exception' => $e,
                    'bucket' => config('filesystems.disks.s3.bucket'),
                    'endpoint' => config('filesystems.disks.s3.endpoint'),
                ]);
            }
        });
    })->create();