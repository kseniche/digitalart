<?php

namespace App\Support;

class WebsiteHelper
{
    public static function normalize(?string $value): ?string
    {
        $raw = trim((string) $value);
        if ($raw === '') {
            return null;
        }

        if (!preg_match('#^[a-zA-Z][a-zA-Z\d+\-.]*:#', $raw)) {
            $raw = 'https://' . ltrim($raw, '/');
        }

        return $raw;
    }

    public static function isValid(?string $value): bool
    {
        $normalized = self::normalize($value);
        if ($normalized === null) {
            return true;
        }

        if (strlen($normalized) > 255) {
            return false;
        }

        if (!filter_var($normalized, FILTER_VALIDATE_URL)) {
            return false;
        }

        $parts = parse_url($normalized);

        return is_array($parts)
            && isset($parts['scheme'], $parts['host'])
            && in_array(strtolower($parts['scheme']), ['http', 'https'], true)
            && $parts['host'] !== '';
    }
}
