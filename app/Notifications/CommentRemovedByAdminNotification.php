<?php

namespace App\Notifications;

use App\Models\Comment;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

class CommentRemovedByAdminNotification extends Notification
{
    public function __construct(
        public Comment $comment
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
        $commentPreview = Str::limit(strip_tags((string) $this->comment->comment_content), 120);

        return (new MailMessage)
            ->subject('Комментарий не прошел модерацию')
            ->greeting('Здравствуйте!')
            ->line('Ваш комментарий не прошел модерацию и был удален.')
            ->line('Причина: комментарий не соответствует правилам площадки.')
            ->line('Комментарий: ' . $commentPreview)
            ->line('Если вы считаете это ошибкой, обратитесь в поддержку.')
            ->salutation('С уважением, команда проекта');
    }
}
