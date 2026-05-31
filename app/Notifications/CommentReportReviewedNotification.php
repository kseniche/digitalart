<?php

namespace App\Notifications;

use App\Models\Comment;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CommentReportReviewedNotification extends Notification
{
    public function __construct(
        public Comment $comment,
        public string $outcomeText
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $this->comment->loadMissing('post');
        $postTitle = $this->comment->post?->post_title ?? 'Публикация';

        return (new MailMessage)
            ->subject('Жалоба рассмотрена')
            ->greeting('Здравствуйте!')
            ->line("Жалоба на комментарий к публикации «{$postTitle}» рассмотрена модератором.")
            ->line($this->outcomeText)
            ->action('Открыть публикацию', url('/post/'.($this->comment->post_id ?? '')))
            ->salutation('С уважением, команда проекта');
    }
}
