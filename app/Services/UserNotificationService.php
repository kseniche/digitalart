<?php

namespace App\Services;

use App\Enums\UserNotificationType;
use App\Models\Comment;
use App\Models\CommentReport;
use App\Models\User;
use App\Models\UserNotification;
use App\Notifications\CommentReportReviewedNotification;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class UserNotificationService
{
    /**
     * @param  array<string, scalar|null>  $replacements
     * @param  array<string, mixed>  $meta
     */
    public function notify(
        User $user,
        UserNotificationType $type,
        array $replacements = [],
        ?Notification $mailNotification = null,
        array $meta = []
    ): ?UserNotification {
        $template = config("user_notifications.templates.{$type->value}");
        if (! is_array($template)) {
            Log::warning('UserNotificationService: unknown template', ['type' => $type->value]);

            return null;
        }

        $replacements = $this->normalizeReplacements($replacements);
        $title = $this->applyTemplate((string) ($template['title'] ?? 'Уведомление'), $replacements);
        $body = $this->applyTemplate((string) ($template['body'] ?? ''), $replacements);
        $actionUrl = $this->buildActionUrl((string) ($template['action'] ?? '/'), $replacements);

        $emailSent = false;
        if ($mailNotification !== null && $this->shouldSendMail($user)) {
            // Защита от ложного `email_sent`: если Notification не использует mail-канал,
            // Laravel не отправит письмо, но мы всё равно создадим внутреннее уведомление.
            $channels = [];
            try {
                if (method_exists($mailNotification, 'via')) {
                    $channels = (array) $mailNotification->via($user);
                }
            } catch (\Throwable) {
                $channels = [];
            }

            if (! in_array('mail', $channels, true)) {
                $mailNotification = null;
            }
        }

        if ($mailNotification !== null && $this->shouldSendMail($user)) {
            try {
                $user->notify($mailNotification);
                $emailSent = true;
            } catch (\Throwable $e) {
                Log::warning('UserNotificationService: mail failed', [
                    'user_id' => $user->id,
                    'type' => $type->value,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return UserNotification::create([
            'user_id' => $user->id,
            'type' => $type,
            'title' => Str::limit($title, 255, ''),
            'body' => $body,
            'action_url' => $actionUrl,
            'meta' => $meta ?: null,
            'email_sent' => $emailSent,
        ]);
    }

    /**
     * @param  iterable<int, User>  $users
     */
    public function notifyMany(
        iterable $users,
        UserNotificationType $type,
        array $replacements = [],
        ?Notification $mailNotification = null,
        array $meta = []
    ): void {
        foreach ($users as $user) {
            if ($user instanceof User) {
                $this->notify($user, $type, $replacements, $mailNotification, $meta);
            }
        }
    }

    public function reasonSuffix(?string $reason): string
    {
        $reason = trim((string) $reason);

        return $reason !== '' ? " Причина: {$reason}." : '';
    }

    public function roleLabel(string $role): string
    {
        return match ($role) {
            'admin' => 'Администратор',
            default => 'Пользователь',
        };
    }

    public function notifyCommentReporters(Comment $comment, string $outcomeText): void
    {
        $comment->loadMissing(['post']);
        $postTitle = $comment->post?->post_title ?? 'Публикация';
        $postId = (string) ($comment->post_id ?? '');

        $reporterIds = CommentReport::query()
            ->where('comment_id', $comment->id)
            ->pluck('user_id')
            ->unique()
            ->filter();

        if ($reporterIds->isEmpty()) {
            return;
        }

        $users = User::query()->whereIn('id', $reporterIds)->get();
        $mail = new CommentReportReviewedNotification($comment, $outcomeText);

        foreach ($users as $reporter) {
            $this->notify(
                $reporter,
                UserNotificationType::ReportReviewed,
                [
                    'title' => $postTitle,
                    'post_id' => $postId,
                    'review_outcome' => $outcomeText,
                ],
                $mail,
                ['comment_id' => $comment->id, 'post_id' => $comment->post_id]
            );
        }
    }

    private function shouldSendMail(User $user): bool
    {
        if (empty($user->email)) {
            return false;
        }
        if (isset($user->email_notifications_enabled) && ! $user->email_notifications_enabled) {
            return false;
        }

        return true;
    }

    /**
     * @param  array<string, scalar|null>  $replacements
     * @return array<string, string>
     */
    private function normalizeReplacements(array $replacements): array
    {
        $normalized = [];
        foreach ($replacements as $key => $value) {
            $normalized[(string) $key] = $value === null ? '' : (string) $value;
        }

        if (! isset($normalized['reason_suffix']) && isset($normalized['reason'])) {
            $normalized['reason_suffix'] = $this->reasonSuffix($normalized['reason']);
        }

        return $normalized;
    }

    private function applyTemplate(string $template, array $replacements): string
    {
        $pairs = [];
        foreach ($replacements as $key => $value) {
            $pairs[':'.$key] = $value;
        }

        return strtr($template, $pairs);
    }

    private function buildActionUrl(string $pattern, array $replacements): string
    {
        $path = $this->applyTemplate($pattern, $replacements);
        if ($path === '' || $path[0] !== '/') {
            $path = '/'.$path;
        }

        return $path;
    }
}
