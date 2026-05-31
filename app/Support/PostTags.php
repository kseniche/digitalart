<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\ValidationException;

/**
 * Разбор и фильтрация тегов публикаций (JSON-массив, JSON-строка CSV, plain CSV).
 */
class PostTags
{
    /** Максимум элементов в JSON-массиве тегов для SQL-фильтра */
    private const MAX_JSON_ARRAY_SLOTS = 20;

    /**
     * @return list<string>
     */
    public static function parse(mixed $value): array
    {
        if (is_array($value)) {
            return array_values(array_filter(
                array_map(static fn ($t) => trim((string) $t), $value),
                static fn ($t) => $t !== ''
            ));
        }

        if (! is_string($value)) {
            return [];
        }

        $value = trim($value);
        if ($value === '') {
            return [];
        }

        $decoded = json_decode($value, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            if (is_array($decoded)) {
                return self::parse($decoded);
            }
            if (is_string($decoded)) {
                return self::parse($decoded);
            }
        }

        // CSV без JSON или с лишними кавычками по краям
        $csv = trim($value, "\"'");

        return array_values(array_filter(
            array_map('trim', explode(',', $csv)),
            static fn ($t) => $t !== ''
        ));
    }

    /**
     * Нормализация списка тегов при сохранении: trim, без пустых, без дублей (без учёта регистра).
     * Сохраняется написание первого вхождения.
     *
     * @return list<string>
     */
    public static function normalizeForStorage(mixed $value): array
    {
        $tags = self::parse($value);
        $seen = [];
        $result = [];

        foreach ($tags as $tag) {
            $key = mb_strtolower($tag);
            if ($key === '' || isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $result[] = $tag;
        }

        return array_values($result);
    }

    /**
     * Нормализация с проверкой лимитов из config/post_tags.php.
     *
     * @return list<string>
     *
     * @throws ValidationException
     */
    public static function normalizeAndValidate(mixed $value): array
    {
        $raw = is_string($value) ? $value : '';
        $maxInput = (int) config('post_tags.max_input_length', 500);
        if (mb_strlen($raw) > $maxInput) {
            throw ValidationException::withMessages([
                'tags' => "Строка тегов не должна превышать {$maxInput} символов.",
            ]);
        }

        $normalized = self::normalizeForStorage($value);
        $maxCount = (int) config('post_tags.max_count', self::MAX_JSON_ARRAY_SLOTS);
        $maxTagLength = (int) config('post_tags.max_tag_length', 50);

        if (count($normalized) > $maxCount) {
            throw ValidationException::withMessages([
                'tags' => "Укажите не более {$maxCount} тегов.",
            ]);
        }

        foreach ($normalized as $tag) {
            if (mb_strlen($tag) > $maxTagLength) {
                throw ValidationException::withMessages([
                    'tags' => "Каждый тег не должен превышать {$maxTagLength} символов.",
                ]);
            }
        }

        return $normalized;
    }

    public static function anyContainsSubstring(array $tags, string $needle): bool
    {
        $needle = mb_strtolower(trim($needle));
        if ($needle === '') {
            return true;
        }

        foreach ($tags as $tag) {
            if (mb_strpos(mb_strtolower($tag), $needle) !== false) {
                return true;
            }
        }

        return false;
    }

    /**
     * Фильтр по подстроке внутри отдельного тега (MySQL / MariaDB / SQLite).
     */
    public static function applyFilter(Builder $query, string $needle): void
    {
        $needle = trim($needle);
        if ($needle === '') {
            return;
        }

        $like = '%' . addcslashes(mb_strtolower($needle), '%_\\') . '%';
        $token = preg_quote(mb_strtolower($needle), '/');
        $csvTokenPattern = '(^|,)([^,]*' . $token . '[^,]*)(,|$)';

        $driver = $query->getConnection()->getDriverName();
        $strategy = 'like_fallback';

        $query->whereNotNull('tags')->where('tags', '!=', '');

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            $strategy = 'mysql_json_extract';
            $query->where(function (Builder $outer) use ($like, $csvTokenPattern) {
                $outer->where(function (Builder $jsonArray) use ($like) {
                    $jsonArray->whereRaw("JSON_VALID(tags) AND JSON_TYPE(tags) = 'ARRAY'");
                    $jsonArray->where(function (Builder $slots) use ($like) {
                        for ($i = 0; $i < self::MAX_JSON_ARRAY_SLOTS; $i++) {
                            $slots->orWhereRaw(
                                "JSON_EXTRACT(tags, '$[$i]') IS NOT NULL AND LOWER(JSON_UNQUOTE(JSON_EXTRACT(tags, '$[$i]'))) LIKE ?",
                                [$like]
                            );
                        }
                    });
                })->orWhere(function (Builder $jsonString) use ($csvTokenPattern) {
                    $jsonString->whereRaw("JSON_VALID(tags) AND JSON_TYPE(tags) = 'STRING'")
                        ->whereRaw(
                            'LOWER(JSON_UNQUOTE(JSON_EXTRACT(tags, \'$\'))) REGEXP ?',
                            [$csvTokenPattern]
                        );
                })->orWhere(function (Builder $legacy) use ($csvTokenPattern) {
                    $legacy->whereRaw('NOT JSON_VALID(tags)')
                        ->whereRaw('LOWER(tags) REGEXP ?', [$csvTokenPattern]);
                });
            });
        } elseif ($driver === 'sqlite') {
            $strategy = 'sqlite_json_each_or_like';
            $query->where(function (Builder $outer) use ($like, $csvTokenPattern) {
                $outer->where(function (Builder $json) use ($like) {
                    $json->whereRaw('json_valid(tags) = 1')
                        ->whereRaw(
                            "EXISTS (
                                SELECT 1 FROM json_each(tags)
                                WHERE lower(json_each.value) LIKE ? ESCAPE '\\'
                            )",
                            [$like]
                        );
                })->orWhere(function (Builder $legacy) use ($like) {
                    $legacy->whereRaw('json_valid(tags) = 0')
                        ->where('tags', 'like', $like);
                });
            });
        } else {
            $query->where('tags', 'like', $like);
        }

        TagSearchLogger::debug('tag_filter.sql_built', [
            'strategy' => $strategy,
            'driver' => $driver,
            'needle' => $needle,
            'like' => $like,
            'csv_regexp_pattern' => $csvTokenPattern,
            'sql' => $query->toSql(),
            'bindings' => $query->getBindings(),
        ]);
    }
}
