<?php

namespace App\Notifications;

use App\Models\Post;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PostReportReviewedNotification extends Notification
{
    public function __construct(
        public ?Post $post,
        public string $outcomeText
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $postTitle = $this->post?->post_title ?? 'Публикация';
        $postId = $this->post?->id ?? '';

        return (new MailMessage)
            ->subject('Жалоба на публикацию рассмотрена')
            ->greeting('Здравствуйте!')
            ->line("Жалоба на публикацию «{$postTitle}» рассмотрена модератором.")
            ->line($this->outcomeText)
            ->action('Открыть публикацию', url('/post/'.$postId))
            ->salutation('С уважением, команда проекта');
    }
}
