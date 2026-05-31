<?php

namespace App\Notifications;

use App\Models\Comment;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CommentRestoredNotification extends Notification
{
    public function __construct(public Comment $comment) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $this->comment->loadMissing('post');
        $postTitle = $this->comment->post?->post_title ?? 'Публикация';

        return (new MailMessage)
            ->subject('Комментарий восстановлен')
            ->greeting('Здравствуйте!')
            ->line("Ваш комментарий к публикации «{$postTitle}» снова отображается на сайте.")
            ->action('Открыть публикацию', url('/post/'.($this->comment->post_id ?? '')))
            ->salutation('С уважением, команда проекта');
    }
}
