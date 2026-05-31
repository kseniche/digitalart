<?php

namespace App\Notifications;

use App\Support\MailAppeal;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class UserRoleChangedNotification extends Notification
{
    public function __construct(public string $roleLabel) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Изменение роли на сайте')
            ->greeting('Здравствуйте!')
            ->line("Ваша роль на сайте изменена на «{$this->roleLabel}».")
            ->line('Если вы не ожидали этого изменения, свяжитесь с администрацией.')
            ->line(MailAppeal::supportLine())
            ->salutation('С уважением, команда проекта');
    }
}
