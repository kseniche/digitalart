<?php

namespace App\Support;

use App\Models\Comment;
use App\Models\Post;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Schema;

/**
 * Формирование CSV-отчёта админки (v2: расширенные колонки, совместимость с Excel).
 * Первые колонки каждой секции совпадают с прежним форматом; новые поля — в конце строки.
 */
class AdminReportCsvBuilder
{
    private const DATE_FORMAT = 'Y-m-d H:i';

    /** @var array<int, string> */
    private const USER_HEADERS = [
        'ID',
        'Имя',
        'Фамилия',
        'Email',
        'Username',
        'Роль',
        'Статус',
        'Дата регистрации',
        'Дата удаления',
        'Заблокирован',
        'Причина блокировки',
        'Телефон',
        'Страна',
        'Email-уведомления',
    ];

    /** @var array<int, string> */
    private const POST_HEADERS = [
        'ID',
        'Название',
        'Автор',
        'Email автора',
        'Теги',
        'Лайков',
        'Комментариев',
        'Статус',
        'Дата создания',
        'Дата удаления',
        'Описание',
        'Категория',
        'Тип медиа',
        'Черновик',
        'Статус модерации',
        'Причина отклонения',
        'Дата публикации',
        'Автомодерация пройдена',
        'Причина автомодерации',
    ];

    /** @var array<int, string> */
    private const COMMENT_HEADERS = [
        'ID',
        'Текст',
        'Автор',
        'Email автора',
        'Публикация',
        'Статус',
        'Дата создания',
        'Дата удаления',
        'ID публикации',
        'Статус модерации',
        'Автомодерация пройдена',
        'Причина автомодерации',
    ];

    /**
     * @param  array<string, int|float|string>  $stats
     * @param  iterable<User>  $users
     * @param  iterable<Post>  $posts
     * @param  iterable<Comment>  $comments
     */
    public function build(array $stats, iterable $users, iterable $posts, iterable $comments): string
    {
        $rows = [];
        $rows = array_merge($rows, $this->reportHeaderRows());
        $rows = array_merge($rows, $this->statsRows($stats));
        $rows[] = [''];
        $rows[] = [''];
        $rows = array_merge($rows, $this->usersSection($users));
        $rows[] = [''];
        $rows[] = [''];
        $rows = array_merge($rows, $this->postsSection($posts));
        $rows[] = [''];
        $rows[] = [''];
        $rows = array_merge($rows, $this->commentsSection($comments));

        return $this->render($rows);
    }

    /**
     * @return array<int, array<int, string>>
     */
    private function reportHeaderRows(): array
    {
        return [
            ['ОТЧЕТ О РАБОТЕ ИНФОРМАЦИОННОЙ СИСТЕМЫ'],
            ['Версия формата', '2'],
            ['Дата создания отчета', $this->formatDate(now())],
            [''],
        ];
    }

    /**
     * @param  array<string, int|float|string>  $stats
     * @return array<int, array<int, string>>
     */
    private function statsRows(array $stats): array
    {
        $scopeSuffix = ! empty($stats['period_is_filtered'])
            ? ' (за период)'
            : ' (за всё время)';

        $rows = [
            ['ОБЩАЯ СТАТИСТИКА'],
            ...($stats['report_period'] ?? null ? [
                ['Период отчёта', $this->cell($stats['report_period'] ?? '')],
                ['Начало периода', $this->cell($stats['period_from'] ?? '—')],
                ['Конец периода', $this->cell($stats['period_to'] ?? '—')],
            ] : []),
            [''],
            ['Показатель', 'Значение'],
            ['Всего пользователей' . $scopeSuffix, $this->cell($stats['total_users'] ?? '')],
            ['Активных пользователей', $this->cell($stats['active_users'] ?? '')],
            ['Удаленных пользователей', $this->cell($stats['deleted_users'] ?? '')],
            ['Заблокированных пользователей', $this->cell($stats['banned_users'] ?? '')],
            [''],
            ['Всего публикаций' . $scopeSuffix, $this->cell($stats['total_posts'] ?? '')],
            ['Активных публикаций', $this->cell($stats['active_posts'] ?? '')],
            ['Удаленных публикаций', $this->cell($stats['deleted_posts'] ?? '')],
            ['Черновиков', $this->cell($stats['draft_posts'] ?? '')],
            ['На модерации', $this->cell($stats['pending_posts'] ?? '')],
            ['Отклоненных публикаций', $this->cell($stats['rejected_posts'] ?? '')],
            ['Одобренных публикаций', $this->cell($stats['approved_posts'] ?? '')],
            [''],
            ['Всего комментариев' . $scopeSuffix, $this->cell($stats['total_comments'] ?? '')],
            ['Активных комментариев', $this->cell($stats['active_comments'] ?? '')],
            ['Удаленных комментариев', $this->cell($stats['deleted_comments'] ?? '')],
            ['Комментариев на модерации', $this->cell($stats['pending_comments'] ?? '')],
            ['Отклоненных комментариев', $this->cell($stats['rejected_comments'] ?? '')],
        ];

        return $rows;
    }

    /**
     * @param  iterable<User>  $users
     * @return array<int, array<int, string>>
     */
    private function usersSection(iterable $users): array
    {
        $rows = [
            ['ПОЛЬЗОВАТЕЛИ'],
            [''],
            self::USER_HEADERS,
        ];

        foreach ($users as $user) {
            $rows[] = $this->userRow($user);
        }

        return $rows;
    }

    /**
     * @return array<int, string>
     */
    private function userRow(User $user): array
    {
        $hasBanReason = Schema::hasColumn('users', 'ban_reason');

        return [
            $this->cell($user->id),
            $this->cell($user->name ?? ''),
            $this->cell($user->user_surname ?? ''),
            $this->cell($user->email),
            $this->cell($user->username ?? ''),
            $this->cell($user->roles->pluck('name')->join(', ')),
            $this->cell($user->deleted_at ? 'Удален' : 'Активен'),
            $this->formatDate($user->created_at),
            $this->formatDate($user->deleted_at, true),
            $this->cell($user->is_banned ?? false, true),
            $hasBanReason ? $this->cell($user->ban_reason ?? '') : '',
            $this->cell($user->phone ?? ''),
            $this->cell($user->country ?? ''),
            $this->cell($user->email_notifications_enabled ?? false, true),
        ];
    }

    /**
     * @param  iterable<Post>  $posts
     * @return array<int, array<int, string>>
     */
    private function postsSection(iterable $posts): array
    {
        $rows = [
            ['ПУБЛИКАЦИИ'],
            [''],
            self::POST_HEADERS,
        ];

        foreach ($posts as $post) {
            $rows[] = $this->postRow($post);
        }

        return $rows;
    }

    /**
     * @return array<int, string>
     */
    private function postRow(Post $post): array
    {
        $authorName = $post->author
            ? trim(($post->author->name ?? '') . ' ' . ($post->author->user_surname ?? ''))
            : 'Неизвестен';

        return [
            $this->cell($post->id),
            $this->cell($post->post_title ?? ''),
            $this->cell($authorName),
            $this->cell($post->author?->email ?? '-'),
            $this->formatTags($post->tags),
            $this->cell($post->likes_count ?? 0),
            $this->cell($post->comments_count ?? 0),
            $this->cell($post->deleted_at ? 'Удален' : 'Активен'),
            $this->formatDate($post->created_at),
            $this->formatDate($post->deleted_at, true),
            $this->cell($post->post_content ?? ''),
            $this->cell($post->category?->name ?? ''),
            $this->cell($this->mediaTypeLabel($post->media_type ?? '')),
            $this->cell($post->is_draft ?? false, true),
            $this->cell($this->moderationLabel($post->moderation_status ?? null)),
            $this->cell($post->moderation_rejection_reason ?? ''),
            $this->formatDate($post->published_at, true),
            $this->cell($post->auto_moderation_passed ?? null, true),
            $this->cell($post->auto_moderation_reason ?? ''),
        ];
    }

    /**
     * @param  iterable<Comment>  $comments
     * @return array<int, array<int, string>>
     */
    private function commentsSection(iterable $comments): array
    {
        $rows = [
            ['КОММЕНТАРИИ'],
            [''],
            self::COMMENT_HEADERS,
        ];

        foreach ($comments as $comment) {
            $rows[] = $this->commentRow($comment);
        }

        return $rows;
    }

    /**
     * @return array<int, string>
     */
    private function commentRow(Comment $comment): array
    {
        $authorName = $comment->author
            ? trim(($comment->author->name ?? '') . ' ' . ($comment->author->user_surname ?? ''))
            : 'Неизвестен';

        return [
            $this->cell($comment->id),
            $this->cell($comment->comment_content ?? ''),
            $this->cell($authorName),
            $this->cell($comment->author?->email ?? '-'),
            $this->cell($comment->post?->post_title ?? 'Удалена'),
            $this->cell($comment->deleted_at ? 'Удален' : 'Активен'),
            $this->formatDate($comment->created_at),
            $this->formatDate($comment->deleted_at, true),
            $this->cell($comment->post_id ?? ''),
            $this->cell($this->moderationLabel($comment->moderation_status ?? null)),
            $this->cell($comment->auto_moderation_passed ?? null, true),
            $this->cell($comment->auto_moderation_reason ?? ''),
        ];
    }

    /**
     * @param  array<int, array<int, mixed>>  $rows
     */
    private function render(array $rows): string
    {
        $handle = fopen('php://temp', 'r+');
        fprintf($handle, chr(0xEF) . chr(0xBB) . chr(0xBF));

        foreach ($rows as $row) {
            $line = array_map(fn ($value) => $this->cell($value), $row);
            fputcsv($handle, $line, ';');
        }

        rewind($handle);
        $csv = stream_get_contents($handle);
        fclose($handle);

        return $csv !== false ? $csv : '';
    }

    private function cell(mixed $value, bool $asBool = false): string
    {
        if ($value === null) {
            return '';
        }

        if ($asBool) {
            if ($value === null || $value === '') {
                return '';
            }

            return filter_var($value, FILTER_VALIDATE_BOOLEAN) ? 'Да' : 'Нет';
        }

        if (is_bool($value)) {
            return $value ? 'Да' : 'Нет';
        }

        if ($value instanceof CarbonInterface) {
            return $value->format(self::DATE_FORMAT);
        }

        return trim((string) $value);
    }

    private function formatDate(mixed $value, bool $allowEmpty = false): string
    {
        if ($value === null || $value === '') {
            return $allowEmpty ? '' : '-';
        }

        if ($value instanceof CarbonInterface) {
            return $value->format(self::DATE_FORMAT);
        }

        return (string) $value;
    }

    private function formatTags(mixed $tags): string
    {
        if (is_array($tags)) {
            $items = array_values(array_filter(array_map('trim', $tags), fn ($t) => $t !== ''));

            return implode(', ', $items);
        }

        if ($tags === null || $tags === '') {
            return '';
        }

        if (is_string($tags)) {
            $decoded = json_decode($tags, true);
            if (is_array($decoded)) {
                return $this->formatTags($decoded);
            }

            return trim($tags);
        }

        return $this->cell($tags);
    }

    private function moderationLabel(?string $status): string
    {
        return match ($status) {
            'approved' => 'Одобрено',
            'pending' => 'На модерации',
            'rejected' => 'Отклонено',
            default => $status ?? '',
        };
    }

    private function mediaTypeLabel(?string $type): string
    {
        return match ($type) {
            'image' => 'Изображение',
            'video' => 'Видео',
            default => $type ?? '',
        };
    }
}
