<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Comment;
use App\Models\Post;
use App\Models\User;
use App\Support\PostTags;
use App\Support\ReportPeriodResolver;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Facades\DB;

class AdminAnalyticsService
{
    /**
     * @return array<string, mixed>
     */
    public function build(string $period): array
    {
        $period = ReportPeriodResolver::isValidChartPeriod($period) ? $period : 'month';
        [$from, $to] = ReportPeriodResolver::resolve($period);

        if (! $from || ! $to) {
            [$from, $to] = ReportPeriodResolver::resolve('month');
        }

        $from = $from->copy()->startOfDay();
        $to = $to->copy()->endOfDay();

        return [
            'period' => $period,
            'period_from' => $from->toIso8601String(),
            'period_to' => $to->toIso8601String(),
            'charts' => [
                'users' => $this->dailySeries(User::withTrashed(), $from, $to),
                'posts' => $this->dailySeries(Post::withTrashed(), $from, $to),
            ],
            'summary' => $this->summaryMetrics($from, $to),
            'top_categories' => $this->topCategories($from, $to),
            'top_tags' => $this->topTags($from, $to),
            'top_authors' => $this->topAuthors($from, $to),
        ];
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Builder<\Illuminate\Database\Eloquent\Model>  $base
     * @return list<array{date: string, label: string, count: int}>
     */
    private function dailySeries($base, Carbon $from, Carbon $to): array
    {
        $dateExpr = $this->dateExpression('created_at');

        $counts = (clone $base)
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw("{$dateExpr} as day_key, COUNT(*) as total")
            ->groupBy('day_key')
            ->pluck('total', 'day_key')
            ->all();

        $series = [];
        foreach (CarbonPeriod::create($from->copy()->startOfDay(), '1 day', $to->copy()->startOfDay()) as $day) {
            $key = $day->format('Y-m-d');
            $series[] = [
                'date' => $key,
                'label' => $day->format('d.m'),
                'count' => (int) ($counts[$key] ?? 0),
            ];
        }

        return $series;
    }

    private function dateExpression(string $column): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "date({$column})",
            default => "DATE({$column})",
        };
    }

    /**
     * @return array<string, int|float>
     */
    private function summaryMetrics(Carbon $from, Carbon $to): array
    {
        $postInPeriod = fn () => Post::query()->whereBetween('created_at', [$from, $to]);
        $commentInPeriod = fn () => Comment::withTrashed()->whereBetween('created_at', [$from, $to]);

        $publishedQuery = Post::query()
            ->whereBetween('created_at', [$from, $to])
            ->whereNull('deleted_at')
            ->where('is_draft', false)
            ->where('moderation_status', 'approved');

        $avgLikes = (clone $publishedQuery)->avg('like_count');

        return [
            'new_users' => User::withTrashed()->whereBetween('created_at', [$from, $to])->count(),
            'published_posts' => (clone $publishedQuery)->count(),
            'pending_moderation' => Post::query()
                ->where('moderation_status', 'pending')
                ->whereNull('deleted_at')
                ->count(),
            'rejected_posts' => $postInPeriod()
                ->where('moderation_status', 'rejected')
                ->whereNull('deleted_at')
                ->count(),
            'new_comments' => $commentInPeriod()->count(),
            'deleted_comments' => $commentInPeriod()->whereNotNull('deleted_at')->count(),
            'avg_likes_per_post' => round((float) ($avgLikes ?? 0), 2),
        ];
    }

    /**
     * @return list<array{id: int, name: string, posts_count: int}>
     */
    private function topCategories(Carbon $from, Carbon $to, int $limit = 8): array
    {
        return Category::query()
            ->withCount([
                'posts' => function ($q) use ($from, $to) {
                    $q->whereNull('deleted_at')
                        ->whereBetween('created_at', [$from, $to]);
                },
            ])
            ->having('posts_count', '>', 0)
            ->orderByDesc('posts_count')
            ->limit($limit)
            ->get(['id', 'name'])
            ->map(fn (Category $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'posts_count' => (int) $c->posts_count,
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array{name: string, posts_count: int}>
     */
    private function topTags(Carbon $from, Carbon $to, int $limit = 8): array
    {
        $merged = [];

        Post::withTrashed()
            ->whereNotNull('tags')
            ->where('tags', '!=', '')
            ->whereBetween('created_at', [$from, $to])
            ->select(['id', 'tags'])
            ->orderBy('id')
            ->chunkById(150, function ($posts) use (&$merged) {
                foreach ($posts as $post) {
                    foreach (PostTags::parse($post->tags) as $tag) {
                        $key = mb_strtolower($tag);
                        if (! isset($merged[$key])) {
                            $merged[$key] = ['name' => $tag, 'posts_count' => 0];
                        }
                        $merged[$key]['posts_count']++;
                    }
                }
            });

        $tags = array_values($merged);
        usort($tags, fn ($a, $b) => $b['posts_count'] <=> $a['posts_count'] ?: strcasecmp($a['name'], $b['name']));

        return array_slice($tags, 0, $limit);
    }

    /**
     * @return list<array{id: int, name: string, posts_count: int}>
     */
    private function topAuthors(Carbon $from, Carbon $to, int $limit = 8): array
    {
        $rows = Post::query()
            ->whereNull('deleted_at')
            ->whereBetween('created_at', [$from, $to])
            ->select('user_id', DB::raw('COUNT(*) as posts_count'))
            ->groupBy('user_id')
            ->orderByDesc('posts_count')
            ->limit($limit)
            ->get();

        if ($rows->isEmpty()) {
            return [];
        }

        $users = User::withTrashed()
            ->whereIn('id', $rows->pluck('user_id'))
            ->get(['id', 'name', 'user_surname'])
            ->keyBy('id');

        return $rows->map(function ($row) use ($users) {
            $user = $users->get($row->user_id);
            $name = $user
                ? trim(($user->name ?? '') . ' ' . ($user->user_surname ?? ''))
                : 'Пользователь #' . $row->user_id;

            return [
                'id' => (int) $row->user_id,
                'name' => $name !== '' ? $name : 'Пользователь #' . $row->user_id,
                'posts_count' => (int) $row->posts_count,
            ];
        })->values()->all();
    }
}
