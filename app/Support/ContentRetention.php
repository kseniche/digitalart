<?php

namespace App\Support;

use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

class ContentRetention
{
    public static function graceDays(): int
    {
        return max(1, (int) config('content_retention.grace_days', 7));
    }

    public static function purgeAt(?CarbonInterface $deletedAt): ?CarbonInterface
    {
        if ($deletedAt === null) {
            return null;
        }

        return $deletedAt->copy()->addDays(self::graceDays());
    }

    public static function canRestore(?CarbonInterface $deletedAt): bool
    {
        if ($deletedAt === null) {
            return false;
        }

        return $deletedAt->greaterThanOrEqualTo(now()->subDays(self::graceDays()));
    }

    public static function daysUntilPurge(?CarbonInterface $deletedAt): ?int
    {
        $purgeAt = self::purgeAt($deletedAt);
        if ($purgeAt === null) {
            return null;
        }

        return $purgeAt->isFuture() ? (int) now()->diffInDays($purgeAt) : 0;
    }

    /**
     * Метаданные для API/UI по soft-deleted записи.
     *
     * @return array{purge_at: ?string, days_until_purge: ?int, can_restore: bool, is_pending_permanent_delete: bool}
     */
    public static function trashedMeta(?CarbonInterface $deletedAt): array
    {
        if ($deletedAt === null) {
            return [
                'purge_at' => null,
                'days_until_purge' => null,
                'can_restore' => false,
                'is_pending_permanent_delete' => false,
            ];
        }

        $purgeAt = self::purgeAt($deletedAt);
        $canRestore = self::canRestore($deletedAt);

        return [
            'purge_at' => $purgeAt?->toIso8601String(),
            'days_until_purge' => self::daysUntilPurge($deletedAt),
            'can_restore' => $canRestore,
            'is_pending_permanent_delete' => $canRestore,
        ];
    }

    /**
     * Метаданные очереди проверки комментария (вкладка «Недавние»).
     *
     * @return array{queue_age_days: int, auto_review_at: ?string, is_queue_overdue: bool, is_expiring_soon: bool}
     */
    public static function commentQueueMeta(CarbonInterface $createdAt, ?CarbonInterface $adminReviewedAt): array
    {
        $reviewDays = (int) config('comment_moderation.auto_review_days', 7);
        $expiringDays = (int) config('content_retention.comment_queue_expiring_days', 2);
        $autoReviewAt = $createdAt->copy()->addDays($reviewDays);
        $queueAgeDays = (int) $createdAt->diffInDays(now());

        $isReviewed = $adminReviewedAt !== null;
        $isOverdue = ! $isReviewed && now()->greaterThanOrEqualTo($autoReviewAt);
        $isExpiringSoon = ! $isReviewed
            && ! $isOverdue
            && now()->greaterThanOrEqualTo($autoReviewAt->copy()->subDays($expiringDays));

        return [
            'queue_age_days' => $queueAgeDays,
            'auto_review_at' => $isReviewed ? null : $autoReviewAt->toIso8601String(),
            'is_queue_overdue' => $isOverdue,
            'is_expiring_soon' => $isExpiringSoon,
        ];
    }
}
