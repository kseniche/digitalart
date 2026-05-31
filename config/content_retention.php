<?php

return [
    /** Дней хранения в корзине после удаления администратором (soft delete) до окончательного удаления */
    'grace_days' => (int) env('CONTENT_RETENTION_GRACE_DAYS', 7),

    /** За сколько дней до авто-проверки комментария показывать «истекает срок» */
    'comment_queue_expiring_days' => (int) env('COMMENT_QUEUE_EXPIRING_DAYS', 2),
];
