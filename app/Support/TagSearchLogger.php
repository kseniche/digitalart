<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

/**
 * Диагностическое логирование фильтра ленты по тегам.
 */
class TagSearchLogger
{
    private const CHANNEL = 'tag_search';

    public static function enabled(): bool
    {
        return (bool) config('tag_search.enabled', false);
    }

    public static function debug(string $message, array $context = []): void
    {
        if (! self::enabled()) {
            return;
        }

        Log::channel(self::CHANNEL)->debug($message, self::enrich($context));
    }

    public static function info(string $message, array $context = []): void
    {
        if (! self::enabled()) {
            return;
        }

        Log::channel(self::CHANNEL)->info($message, self::enrich($context));
    }

    public static function warning(string $message, array $context = []): void
    {
        if (! self::enabled()) {
            return;
        }

        Log::channel(self::CHANNEL)->warning($message, self::enrich($context));
    }

    public static function error(string $message, array $context = []): void
    {
        if (! self::enabled()) {
            return;
        }

        Log::channel(self::CHANNEL)->error($message, self::enrich($context));
    }

    public static function logFilterApplied(string $needle, Builder $query, array $meta = []): void
    {
        if (! self::enabled()) {
            return;
        }

        self::info('tag_filter.applied', array_merge($meta, [
            'needle' => $needle,
            'needle_lower' => mb_strtolower($needle),
            'db_driver' => $query->getConnection()->getDriverName(),
            'sql' => $query->toSql(),
            'bindings' => $query->getBindings(),
        ]));
    }

    public static function logFeedResult(string $needle, Builder $query, int $total, array $postsSample, array $meta = []): void
    {
        if (! self::enabled()) {
            return;
        }

        $mismatches = [];
        foreach ($postsSample as $row) {
            $parsed = PostTags::parse($row['tags_raw'] ?? $row['tags'] ?? null);
            $matches = PostTags::anyContainsSubstring($parsed, $needle);
            if (! $matches) {
                $mismatches[] = [
                    'post_id' => $row['id'] ?? null,
                    'title' => $row['title'] ?? null,
                    'tags_raw' => $row['tags_raw'] ?? null,
                    'tags_parsed' => $parsed,
                ];
            }
        }

        $context = array_merge($meta, [
            'needle' => $needle,
            'total' => $total,
            'sample_count' => count($postsSample),
            'posts_sample' => $postsSample,
            'sql' => $query->toSql(),
            'bindings' => $query->getBindings(),
        ]);

        if ($mismatches !== []) {
            self::warning('tag_filter.result_mismatch', array_merge($context, [
                'mismatches' => $mismatches,
                'hint' => 'Публикация в выдаче, но ни один распарсенный тег не содержит needle',
            ]));
        } else {
            self::info('tag_filter.result_ok', $context);
        }
    }

    public static function logException(Throwable $e, array $context = []): void
    {
        if (! self::enabled()) {
            return;
        }

        self::error('tag_filter.exception', array_merge($context, [
            'exception' => $e::class,
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ]));
    }

    /**
     * @return array<string, mixed>
     */
    private static function enrich(array $context): array
    {
        return array_merge([
            'request_id' => Str::uuid()->toString(),
            'at' => now()->toIso8601String(),
        ], $context);
    }
}
