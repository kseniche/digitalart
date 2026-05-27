<?php

namespace App\Notifications;

use App\Models\Post;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PostFavoritedNotification extends Notification
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
        $postTitle = $this->post->post_title ?? 'Публикация';

        return (new MailMessage)
            ->subject('Вашу публикацию добавили в избранное')
            ->greeting('Здравствуйте!')
            ->line("Вашу публикацию «{$postTitle}» добавили в избранное.")
            ->action('Посмотреть публикацию', url('/post/' . $this->post->id))
            ->line('Если вы не хотите получать такие уведомления — отключите их в настройках профиля.')
            ->salutation('С уважением, команда проекта');
    }
}
