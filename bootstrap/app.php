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

        $middleware->alias([
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
            'admin' => \App\Http\Middleware\AdminMiddleware::class,
        ]);

        //  Отключение CSRF для API 
        $middleware->validateCsrfTokens(except: [
            'api/*',
        ]);
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