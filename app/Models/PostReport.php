<?php

namespace App\Models;

use App\Enums\PostReportStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PostReport extends Model
{
    protected $fillable = [
        'post_id',
        'user_id',
        'reason',
        'other_text',
        'status',
        'reviewed_by',
        'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => PostReportStatus::class,
            'reviewed_at' => 'datetime',
        ];
    }

    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class);
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public static function reasonLabel(string $reason): string
    {
        return config("post_reports.report_reasons.{$reason}", $reason);
    }
}
