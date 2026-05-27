<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Добавляет заголовок Content-Security-Policy для защиты от XSS (критерий 2.2.9).
 * Строгая политика, совместимая с SPA на React (inline-стили разрешены для React).
 */
class ContentSecurityPolicy
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Vite dev: источники для скриптов/стилей (используем IPv4/localhost, без IPv6)
        $vite = 'http://127.0.0.1:5173 http://localhost:5173';
        $isDev = config('app.debug');

        $defaultSrc = "'self'";
        $scriptSrc = "'self' {$vite}";
        $styleSrc = "'self' 'unsafe-inline' {$vite}";

        if ($isDev) {
            $defaultSrc .= ' ' . $vite;
            $scriptSrc .= " 'unsafe-inline' 'unsafe-eval'";
        }

        // Изображения и видео: свой сервер + storage + S3/Selectel
        $storageSrc = $this->storageSources();
        $imgSrc = "'self' data: blob: {$storageSrc}";
        $mediaSrc = $imgSrc;
        $workerSrc = "'self' blob:";
        if ($isDev) {
            $workerSrc .= ' http://127.0.0.1:5173 http://localhost:5173';
        }

        $directives = [
            "default-src {$defaultSrc}",
            "script-src {$scriptSrc}",
            "script-src-elem {$scriptSrc}",
            "style-src {$styleSrc}",
            "style-src-elem {$styleSrc}",
            "img-src {$imgSrc}",
            "media-src {$mediaSrc}",
            "worker-src {$workerSrc}",
            "font-src 'self'",
            "connect-src 'self' http://localhost https://localhost http://127.0.0.1 https://127.0.0.1 http://localhost:8000 http://localhost:5173 http://127.0.0.1:8000 http://127.0.0.1:5173 ws://127.0.0.1:5173 ws://localhost:5173",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ];

        $csp = implode('; ', $directives);
        $response->headers->set('Content-Security-Policy', $csp);

        return $response;
    }

    private function storageSources(): string
    {
        $sources = [
            'https://*.selstorage.ru',
            'https://*.selcloud.ru',
            'https://*.storage.selcloud.ru',
        ];

        $appUrl = rtrim((string) config('app.url'), '/');
        if ($appUrl !== '') {
            $sources[] = $appUrl;
            $sources[] = $appUrl . '/storage';
        }

        foreach (['AWS_PUBLIC_URL', 'AWS_URL', 'AWS_ENDPOINT'] as $envKey) {
            $raw = env($envKey);
            if (is_string($raw) && $raw !== '') {
                $sources[] = rtrim($raw, '/');
            }
        }

        $endpoint = config('filesystems.disks.s3.endpoint');
        if (is_string($endpoint) && $endpoint !== '') {
            $sources[] = rtrim($endpoint, '/');
        }

        $bucket = config('filesystems.disks.s3.bucket');
        if (is_string($endpoint) && $endpoint !== '' && is_string($bucket) && $bucket !== '') {
            $sources[] = rtrim($endpoint, '/') . '/' . $bucket;
        }

        return implode(' ', array_unique($sources));
    }
}
