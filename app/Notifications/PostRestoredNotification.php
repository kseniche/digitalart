<?php

namespace App\Notifications;

use App\Models\Post;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PostRestoredNotification extends Notification
{
    public function __construct(public Post $post) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $title = $this->post->post_title ?: 'Без названия';

        return (new MailMessage)
            ->subject('Публикация восстановлена')
            ->greeting('Здравствуйте!')
            ->line("Публикация «{$title}» восстановлена администратором и снова доступна на сайте.")
            ->action('Открыть публикацию', url('/post/'.$this->post->id))
            ->salutation('С уважением, команда проекта');
    }
}
