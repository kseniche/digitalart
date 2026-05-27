<?php

namespace App\Support;

use libphonenumber\NumberParseException;
use libphonenumber\PhoneNumberFormat;
use libphonenumber\PhoneNumberUtil;

/**
 * Единый формат хранения телефона в БД: E.164 (международный, все страны).
 */
class PhoneHelper
{
    private static ?PhoneNumberUtil $util = null;

    private static function util(): PhoneNumberUtil
    {
        return self::$util ??= PhoneNumberUtil::getInstance();
    }

    public static function normalize(?string $value): ?string
    {
        $raw = trim((string) $value);
        if ($raw === '') {
            return null;
        }

        try {
            $number = self::util()->parse($raw, null);
            if (!self::util()->isValidNumber($number)) {
                return null;
            }

            return self::util()->format($number, PhoneNumberFormat::E164);
        } catch (NumberParseException) {
            return null;
        }
    }

    public static function isValid(?string $value): bool
    {
        return self::normalize($value) !== null;
    }

    /**
     * Формат для отображения в форме (INTERNATIONAL: +7 900 123-45-67).
     */
    public static function formatForDisplay(?string $stored): string
    {
        $raw = trim((string) $stored);
        if ($raw === '') {
            return '';
        }

        try {
            $number = self::util()->parse($raw, null);

            return self::util()->format($number, PhoneNumberFormat::INTERNATIONAL);
        } catch (NumberParseException) {
            return $raw;
        }
    }
}
