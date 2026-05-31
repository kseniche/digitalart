<?php

namespace App\Notifications;

use App\Models\Comment;
use App\Support\MailAppeal;
use Carbon\CarbonInterface;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

class CommentRemovedByAdminNotification extends Notification
{
    public function __construct(
        public Comment $comment,
        public ?string $reason = null,
        public ?CarbonInterface $occurredAt = null
    ) {}

    public function via(object $notifiable): array
    {
        if (empty($notifiable->email)) {
            return [];
        }
        if (isset($notifiable->email_notifications_enabled) && ! $notifiable->email_notifications_enabled) {
            return [];
        }

        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $commentPreview = Str::limit(strip_tags((string) $this->comment->comment_content), 120);
        $reason = trim((string) ($this->reason ?? ''));
        if ($reason === '') {
            $reason = 'комментарий не соответствует правилам площадки';
        }

        return (new MailMessage)
            ->subject('Комментарий удалён модератором')
            ->greeting('Здравствуйте!')
            ->line(MailAppeal::eventDateLine($this->occurredAt))
            ->line('Ваш комментарий удалён администратором.')
            ->line("Причина: {$reason}")
            ->line('Комментарий: '.$commentPreview)
            ->line(MailAppeal::supportLine())
            ->salutation('С уважением, команда проекта');
    }
}
