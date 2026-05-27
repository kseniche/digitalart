<?php

namespace App\Notifications;

use App\Models\Post;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PostApprovedNotification extends Notification
{
    public function __construct(
        public Post $post
    ) {}

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
        $title = $this->post->post_title ?: 'Без названия';

        return (new MailMessage)
            ->subject('Публикация прошла модерацию')
            ->greeting('Здравствуйте!')
            ->line("Ваша публикация «{$title}» прошла модерацию и опубликована.")
            ->action('Открыть публикацию', url('/post/' . $this->post->id))
            ->salutation('С уважением, команда проекта');
    }
}
