<?php

namespace App\Support;

use Carbon\Carbon;

/**
 * Периоды отчётов и аналитики админ-панели.
 */
final class ReportPeriodResolver
{
    public const PERIODS = ['week', 'month', 'quarter', 'year', 'all'];

    /**
     * @return array{0: ?Carbon, 1: ?Carbon}
     */
    public static function resolve(?string $period): array
    {
        $period = $period ? trim($period) : 'all';

        if ($period === '' || $period === 'all') {
            return [null, null];
        }

        $to = now();

        $from = match ($period) {
            'week' => $to->copy()->subWeek(),
            'month' => $to->copy()->subMonth(),
            'quarter' => $to->copy()->subMonths(3),
            'year' => $to->copy()->subYear(),
            default => null,
        };

        if ($from === null) {
            return [null, null];
        }

        return [$from, $to];
    }

    public static function isValidChartPeriod(?string $period): bool
    {
        return in_array($period, ['week', 'month', 'quarter', 'year'], true);
    }
}
