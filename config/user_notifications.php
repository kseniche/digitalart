<?php

use App\Enums\UserNotificationType;

return [
    'email_hint' => 'Подробная информация направлена на вашу электронную почту.',

    'templates' => [
        UserNotificationType::PostFavorited->value => [
            'title' => 'Добавили в избранное',
            'body' => ':by_name добавил(а) вашу публикацию «:title» в избранное.',
            'action' => '/post/:post_id',
        ],
        UserNotificationType::PostPendingModeration->value => [
            'title' => 'Публикация на модерации',
            'body' => 'Публикация «:title» отправлена на проверку. Обычно решение принимается в течение 1–3 рабочих дней.',
            'action' => '/post/:post_id',
        ],
        UserNotificationType::PostApproved->value => [
            'title' => 'Публикация одобрена',
            'body' => 'Публикация «:title» прошла модерацию и доступна в ленте.',
            'action' => '/post/:post_id',
        ],
        UserNotificationType::PostRejected->value => [
            'title' => 'Публикация отклонена',
            'body' => 'Публикация «:title» не прошла модерацию.:reason_suffix Вы можете исправить материал и отправить повторно.',
            'action' => '/post/:post_id',
        ],
        UserNotificationType::PostDeleted->value => [
            'title' => 'Публикация удалена',
            'body' => 'Публикация «:title» снята с площадки администратором.:reason_suffix',
            'action' => '/profile/:user_id',
        ],
        UserNotificationType::PostRestored->value => [
            'title' => 'Публикация восстановлена',
            'body' => 'Публикация «:title» снова доступна на сайте.',
            'action' => '/post/:post_id',
        ],
        UserNotificationType::CommentPublished->value => [
            'title' => 'Комментарий опубликован',
            'body' => 'Ваш комментарий к публикации «:title» опубликован и виден другим пользователям.',
            'action' => '/post/:post_id',
        ],
        UserNotificationType::CommentDeleted->value => [
            'title' => 'Комментарий удалён',
            'body' => ':delete_context:reason_suffix',
            'action' => '/post/:post_id',
        ],
        UserNotificationType::CommentRestored->value => [
            'title' => 'Комментарий восстановлен',
            'body' => 'Ваш комментарий к публикации «:title» снова отображается на сайте.',
            'action' => '/post/:post_id',
        ],
        UserNotificationType::CommentOnYourPost->value => [
            'title' => 'Новый комментарий',
            'body' => ':author_name оставил(а) комментарий к публикации «:title».',
            'action' => '/post/:post_id',
        ],
        UserNotificationType::ReportSubmitted->value => [
            'title' => 'Жалоба принята',
            'body' => 'Ваша жалоба на комментарий к публикации «:title» принята и передана модератору.',
            'action' => '/post/:post_id',
        ],
        UserNotificationType::ReportReviewed->value => [
            'title' => 'Жалоба рассмотрена',
            'body' => ':review_outcome',
            'action' => '/post/:post_id',
        ],
        UserNotificationType::AccountBanned->value => [
            'title' => 'Аккаунт заблокирован',
            'body' => 'Ваш аккаунт заблокирован.:reason_suffix Доступ к действиям на сайте ограничен.',
            'action' => '/settings',
        ],
        UserNotificationType::AccountUnbanned->value => [
            'title' => 'Аккаунт разблокирован',
            'body' => 'Блокировка снята. Вы снова можете пользоваться сервисом.',
            'action' => '/',
        ],
        UserNotificationType::RoleChanged->value => [
            'title' => 'Роль изменена',
            'body' => 'Ваша роль на сайте изменена на «:role_label».',
            'action' => '/settings',
        ],
    ],
];
