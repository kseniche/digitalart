<?php

/**
 * Единые лимиты пользовательского ввода (серверная валидация).
 * Должны соответствовать resources/js/constants/fieldLimits.js
 */
return [
    'post' => [
        'title' => ['min' => 1, 'max' => 255],
        'description' => ['min' => 1, 'max' => 50000],
    ],
    'comment' => [
        'content' => ['min' => 1, 'max' => 2000],
    ],
    'comment_report' => [
        'other_text' => ['min' => 0, 'max' => 1000],
    ],
    'profile' => [
        'name' => ['min' => 1, 'max' => 255],
        'user_surname' => ['min' => 0, 'max' => 255],
        'username' => ['min' => 3, 'max' => 255],
        'email' => ['min' => 0, 'max' => 255],
        'phone' => ['min' => 0, 'max' => 16],
        'website' => ['min' => 0, 'max' => 255],
        'bio' => ['min' => 0, 'max' => 2000],
    ],
    'auth' => [
        'first_name' => ['min' => 1, 'max' => 255],
        'last_name' => ['min' => 1, 'max' => 255],
        'username' => ['min' => 3, 'max' => 255],
        'email' => ['min' => 0, 'max' => 255],
        'password' => ['min' => 8, 'max' => 255],
    ],
    'admin' => [
        'ban_reason' => ['min' => 3, 'max' => 1000],
    ],
];
