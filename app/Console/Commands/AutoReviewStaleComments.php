<?php

namespace App\Console\Commands;

use App\Services\CommentModerationService;
use Illuminate\Console\Command;

class AutoReviewStaleComments extends Command
{
    protected $signature = 'comments:auto-review-stale';

    protected $description = 'Помечает комментарии без жалоб как проверенные через N дней после публикации';

    public function handle(CommentModerationService $service): int
    {
        $count = $service->autoReviewStaleComments();
        $this->info("Проверено автоматически: {$count} комментариев.");

        return self::SUCCESS;
    }
}
