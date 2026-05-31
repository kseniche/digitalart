<?php

namespace App\Console\Commands;

use App\Models\Comment;
use App\Models\Like;
use App\Models\Post;
use Illuminate\Console\Command;

class SyncPostCounts extends Command
{
    protected $signature = 'posts:sync-counts {--dry-run : Только показать расхождения}';

    protected $description = 'Сверка денормализованных like_count и comment_count с фактическими данными';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $fixed = 0;
        $checked = 0;

        Post::query()->orderBy('id')->chunkById(100, function ($posts) use ($dryRun, &$fixed, &$checked) {
            foreach ($posts as $post) {
                $checked++;
                $actualLikes = Like::query()
                    ->where('post_id', $post->id)
                    ->whereNull('deleted_at')
                    ->count();

                $actualComments = Comment::query()
                    ->where('post_id', $post->id)
                    ->where('moderation_status', 'approved')
                    ->whereNull('deleted_at')
                    ->where('is_hidden', false)
                    ->count();

                $likeDrift = (int) $post->like_count !== $actualLikes;
                $commentDrift = (int) $post->comment_count !== $actualComments;

                if ($likeDrift || $commentDrift) {
                    $this->line("Post #{$post->id}: likes {$post->like_count}→{$actualLikes}, comments {$post->comment_count}→{$actualComments}");
                    if (! $dryRun) {
                        $post->update([
                            'like_count' => $actualLikes,
                            'comment_count' => $actualComments,
                        ]);
                    }
                    $fixed++;
                }
            }
        });

        $this->info("Checked: {$checked}, ".($dryRun ? 'drift rows' : 'fixed').": {$fixed}");

        return self::SUCCESS;
    }
}
