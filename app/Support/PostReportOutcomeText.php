<?php

namespace App\Support;

/**
 * Тексты исходов рассмотрения жалоб на публикации.
 */
final class PostReportOutcomeText
{
    public static function confirmed(): string
    {
        return 'Жалоба подтверждена. Нарушение было установлено модератором.';
    }

    public static function rejected(): string
    {
        return 'Жалоба отклонена. Нарушение не было подтверждено.';
    }

    public static function measuresTaken(string $measure = 'публикация снята с площадки'): string
    {
        $measure = trim($measure) !== '' ? trim($measure) : 'публикация снята с площадки';

        return "По жалобе приняты меры: {$measure}.";
    }
}
