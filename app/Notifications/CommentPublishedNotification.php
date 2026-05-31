<?php

namespace App\Notifications;

use App\Models\Comment;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

class CommentPublishedNotification extends Notification
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
        $preview = Str::limit(strip_tags((string) $this->comment->comment_content), 120);

        return (new MailMessage)
            ->subject('Комментарий опубликован')
            ->greeting('Здравствуйте!')
            ->line("Ваш комментарий к публикации «{$postTitle}» опубликован.")
            ->line('Текст: '.$preview)
            ->action('Открыть публикацию', url('/post/'.($this->comment->post_id ?? '')))
            ->salutation('С уважением, команда проекта');
    }
}
