<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class UserBannedNotification extends Notification
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
        $mail = (new MailMessage)
            ->subject('Ваш аккаунт заблокирован')
            ->greeting('Здравствуйте!')
            ->line('Ваш аккаунт был заблокирован администратором.');

        if (!empty($notifiable->ban_reason)) {
            $mail->line('Причина: ' . $notifiable->ban_reason);
        }

        return $mail
            ->line('Если вы считаете это ошибкой — свяжитесь с поддержкой.')
            ->salutation('С уважением, команда проекта');
    }
}
