<?php

namespace App\Notifications;

use App\Models\Post;
use App\Support\MailAppeal;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PostPendingModerationNotification extends Notification
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
            ->subject('Публикация отправлена на модерацию')
            ->greeting('Здравствуйте!')
            ->line("Ваша публикация «{$title}» отправлена на проверку модератором.")
            ->line('После одобрения она появится в общей ленте. Обычно решение принимается в течение 1–3 рабочих дней.')
            ->action('Открыть публикацию', url('/post/'.$this->post->id))
            ->line(MailAppeal::supportLine())
            ->salutation('С уважением, команда проекта');
    }
}
