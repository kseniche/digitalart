<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class UserUnbannedNotification extends Notification
{
    public function via(object $notifiable): array
    {
        if (empty($notifiable->email)) {
            return [];
        }
        if (isset($notifiable->email_notifications_enabled) && !$notifiable->email_notifications_enabled) {
            return [];
        }
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Ваш аккаунт разблокирован')
            ->greeting('Здравствуйте!')
            ->line('Ваш аккаунт был разблокирован администратором.')
            ->line('Теперь вы снова можете пользоваться сервисом.')
            ->salutation('С уважением, команда проекта');
    }
}
