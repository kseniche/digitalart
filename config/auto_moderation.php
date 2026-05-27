<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Автомодерация контента
    |--------------------------------------------------------------------------
    |
    | Этот список можно расширять без изменений в коде.
    | Проверка применяется к постам и комментариям до ручной модерации.
    |
    */
    'enabled' => env('AUTO_MODERATION_ENABLED', true),

    // Можно задавать через .env: AUTO_MODERATION_BANNED_WORDS=word1,word2
    'banned_words' => array_values(array_filter(array_map(
        static fn (string $word): string => trim($word),
        explode(',', (string) env('AUTO_MODERATION_BANNED_WORDS', ''))
    ), static fn (string $word): bool => $word !== '')),

    // Базовый словарь вынесен в отдельный файл config/banned_words.php
    'default_banned_words' => require __DIR__ . '/banned_words.php',

    // Замены символов для борьбы с маскировкой (leet/кириллица/латиница).
    'character_map' => [
        '@' => 'a',
        '4' => 'a',
        '3' => 'e',
        '1' => 'i',
        '!' => 'i',
        '0' => 'o',
        '$' => 's',
        '5' => 's',
        '7' => 't',
    ],
];
