<?php

namespace App\Notifications;

use App\Models\Comment;
use App\Models\CommentReport;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CommentReportSubmittedNotification extends Notification
{
    public function __construct(
        public Comment $comment,
        public CommentReport $report
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $this->comment->loadMissing('post');
        $postTitle = $this->comment->post?->post_title ?? 'Публикация';
        $reason = CommentReport::reasonLabel($this->report->reason);

        return (new MailMessage)
            ->subject('Жалоба принята')
            ->greeting('Здравствуйте!')
            ->line("Ваша жалоба на комментарий к публикации «{$postTitle}» принята.")
            ->line("Указанная причина: {$reason}")
            ->line('Модератор рассмотрит обращение. О результатах вы получите уведомление.')
            ->action('Открыть публикацию', url('/post/'.($this->comment->post_id ?? '')))
            ->salutation('С уважением, команда проекта');
    }
}
