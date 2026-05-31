<?php

namespace App\Notifications;

use App\Models\Comment;
use App\Support\MailAppeal;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Отправка письма сразу при вызове notify() (без очереди), чтобы письма доходили
 * без обязательного запуска `php artisan queue:work`.
 */
class NewCommentNotification extends Notification
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
        // Письмо уходит на $notifiable->email (почта получателя из БД), а не на адрес из .env
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $this->comment->load(['post', 'author']);
        $post = $this->comment->post;
        $authorName = $this->comment->author
            ? trim($this->comment->author->name . ' ' . ($this->comment->author->user_surname ?? ''))
            : 'Пользователь';
        $postTitle = $post ? ($post->post_title ?? 'Публикация') : 'Публикация';
        $preview = \Illuminate\Support\Str::limit(strip_tags($this->comment->comment_content ?? ''), 100);

        return (new MailMessage)
            ->subject('Новый комментарий к вашей публикации')
            ->greeting('Здравствуйте!')
            ->line("Пользователь {$authorName} оставил комментарий к вашей публикации «{$postTitle}».")
            ->line('Текст комментария: ' . $preview)
            ->action('Посмотреть публикацию', url('/post/' . ($post->id ?? '')))
            ->line('Если вы не хотите получать такие уведомления — отключите их в настройках профиля.')
            ->line(MailAppeal::supportLine())
            ->salutation('С уважением, команда проекта');
    }
}
