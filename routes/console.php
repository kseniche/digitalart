<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Удаление просроченных personal access tokens из personal_access_tokens.
Schedule::command('sanctum:prune-expired --hours=24')->daily();
Schedule::command('comments:auto-review-stale')->daily();
Schedule::command('content:purge-trashed')->daily();
