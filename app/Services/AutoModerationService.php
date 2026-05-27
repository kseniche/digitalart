<?php

namespace App\Services;

use App\Models\BannedWord;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class AutoModerationService
{
    public function checkText(string $text): array
    {
        if (!config('auto_moderation.enabled', true)) {
            return [
                'passed' => true,
                'reason' => null,
                'matched' => [],
            ];
        }

        $normalizedText = $this->normalize($text);
        $bannedWords = $this->getDictionary();
        $matched = [];

        foreach ($bannedWords as $word) {
            $normalizedWord = $this->normalize($word);
            if ($normalizedWord === '') {
                continue;
            }

            // Частичное совпадение для поиска вариаций слова в тексте.
            if (str_contains($normalizedText, $normalizedWord)) {
                $matched[] = $word;
            }
        }

        if ($matched === []) {
            return [
                'passed' => true,
                'reason' => null,
                'matched' => [],
            ];
        }

        return [
            'passed' => false,
            'reason' => 'Нарушение правил сообщества: обнаружены запрещенные слова.',
            'matched' => array_values(array_unique($matched)),
        ];
    }

    public function checkPost(string $title, string $content, array $tags = []): array
    {
        $text = trim($title . ' ' . $content . ' ' . implode(' ', $tags));
        return $this->checkText($text);
    }

    private function getDictionary(): array
    {
        $custom = config('auto_moderation.banned_words', []);
        $default = config('auto_moderation.default_banned_words', []);
        $dbWords = [];

        try {
            if (Schema::hasTable('banned_words')) {
                $dbWords = BannedWord::query()->pluck('word')->all();
            }
        } catch (\Throwable $e) {
            Log::warning('Не удалось загрузить словарь banned_words из БД', [
                'error' => $e->getMessage(),
            ]);
        }

        $merged = array_merge(
            is_array($custom) ? $custom : [],
            is_array($default) ? $default : [],
            is_array($dbWords) ? $dbWords : []
        );

        return array_values(array_unique(array_filter(array_map(
            static fn ($word): string => trim((string) $word),
            $merged
        ), static fn (string $word): bool => $word !== '')));
    }

    private function normalize(string $text): string
    {
        $text = mb_strtolower($text, 'UTF-8');
        $map = config('auto_moderation.character_map', []);
        if (is_array($map) && $map !== []) {
            $text = strtr($text, $map);
        }

        // Убираем разделители и спецсимволы для устойчивости к обходам.
        $text = preg_replace('/[\s\p{P}\p{S}_]+/u', '', $text) ?? '';

        return $text;
    }
}
