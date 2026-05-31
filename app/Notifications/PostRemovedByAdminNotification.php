<?php

namespace App\Notifications;

use App\Models\Post;
use App\Support\MailAppeal;
use Carbon\CarbonInterface;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PostRemovedByAdminNotification extends Notification
{
    public function __construct(
        public Post $post,
        public string $mode = 'rejected',
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
        $title = $this->post->post_title ?: 'Без названия';
        $isHardDelete = $this->mode === 'deleted';
        $reason = trim((string) ($this->reason ?? ''));

        $mail = (new MailMessage)
            ->subject($isHardDelete ? 'Публикация удалена за нарушение правил' : 'Публикация не прошла модерацию')
            ->greeting('Здравствуйте!')
            ->line(MailAppeal::eventDateLine($this->occurredAt))
            ->line($isHardDelete
                ? "Ваша публикация «{$title}» удалена из-за нарушения правил сообщества."
                : "Ваша публикация «{$title}» не прошла модерацию и отклонена.")
            ->line($isHardDelete
                ? 'Публикация снята с площадки за нарушение правил сообщества.'
                : 'Вы можете исправить публикацию и отправить её на модерацию повторно.');

        if ($reason !== '') {
            $mail->line("Причина: {$reason}");
        }

        return $mail
            ->line(MailAppeal::supportLine())
            ->salutation('С уважением, команда проекта');
    }
}
