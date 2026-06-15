<?php

namespace App\Support;

/**
 * Тексты исходов рассмотрения жалоб на комментарии (внутренние уведомления и email).
 */
final class CommentReportOutcomeText
{
    public const MEASURE_COMMENT_DELETED = 'comment_deleted';

    public const MEASURE_COMMENT_HIDDEN = 'comment_hidden';

    public const MEASURE_USER_SANCTIONED = 'user_sanctioned';

    public const MEASURE_OTHER = 'other';

    public static function unjustified(): string
    {
        return 'Жалоба рассмотрена. Нарушение не было подтверждено. Жалоба закрыта без применения санкций.';
    }

    public static function justified(string $measure, ?string $details = null): string
    {
        $measureText = match ($measure) {
            self::MEASURE_COMMENT_DELETED => 'Комментарий удалён.',
            self::MEASURE_COMMENT_HIDDEN => 'Комментарий скрыт с сайта.',
            self::MEASURE_USER_SANCTIONED => 'К автору комментария применены санкции.',
            self::MEASURE_OTHER => 'Приняты иные меры модерации.',
            default => 'Приняты меры модерации.',
        };

        $text = "Жалоба рассмотрена. По результатам проверки приняты меры: {$measureText}";
        $details = trim((string) $details);

        return $details !== '' ? "{$text} {$details}" : $text;
    }
}
