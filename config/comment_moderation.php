<?php

return [
    'auto_review_days' => (int) env('COMMENT_AUTO_REVIEW_DAYS', 7),
    'auto_hide_reports_count' => (int) env('COMMENT_AUTO_HIDE_REPORTS', 5),

    'report_reasons' => [
        'profanity' => 'Нецензурная лексика',
        'insult' => 'Оскорбление',
        'spam' => 'Спам',
        'advertising' => 'Реклама',
        'prohibited' => 'Запрещённый контент',
        'off_topic' => 'Контент не по теме сообщества',
        'other' => 'Другое',
    ],
];
