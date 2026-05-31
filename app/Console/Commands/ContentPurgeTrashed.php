<?php

namespace App\Console\Commands;

use App\Models\Comment;
use App\Models\Like;
use App\Models\Post;
use App\Services\CommentModerationService;
use App\Support\ContentRetention;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ContentPurgeTrashed extends Command
{
    protected $signature = 'content:purge-trashed';

    protected $description = 'Окончательно удаляет публикации и комментарии из корзины после периода хранения';

    public function handle(CommentModerationService $moderation): int
    {
        $cutoff = now()->subDays(ContentRetention::graceDays());
        $postsPurged = 0;
        $commentsPurged = 0;

        Post::onlyTrashed()
            ->where('deleted_at', '<', $cutoff)
            ->orderBy('id')
            ->chunkById(50, function ($posts) use (&$postsPurged) {
                foreach ($posts as $post) {
                    $this->purgePost($post);
                    $postsPurged++;
                }
            });

        Comment::onlyTrashed()
            ->where('deleted_at', '<', $cutoff)
            ->orderBy('id')
            ->chunkById(100, function ($comments) use ($moderation, &$commentsPurged) {
                foreach ($comments as $comment) {
                    $moderation->forceDeleteComment($comment);
                    $commentsPurged++;
                }
            });

        $this->info("Purged posts: {$postsPurged}, comments: {$commentsPurged}");
        Log::info('content:purge-trashed completed', [
            'posts' => $postsPurged,
            'comments' => $commentsPurged,
            'cutoff' => $cutoff->toIso8601String(),
        ]);

        return self::SUCCESS;
    }

    private function purgePost(Post $post): void
    {
        if ($post->media_path && ! str_starts_with((string) $post->media_path, 'http')) {
            foreach (['s3', 'public'] as $disk) {
                try {
                    if (Storage::disk($disk)->exists($post->media_path)) {
                        Storage::disk($disk)->delete($post->media_path);
                        break;
                    }
                } catch (\Throwable $e) {
                    Log::warning('content:purge-trashed media delete failed', [
                        'post_id' => $post->id,
                        'disk' => $disk,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }

        Comment::withTrashed()->where('post_id', $post->id)->forceDelete();
        Like::withTrashed()->where('post_id', $post->id)->forceDelete();
        $post->forceDelete();
    }
}
