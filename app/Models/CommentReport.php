<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommentReport extends Model
{
    protected $fillable = [
        'comment_id',
        'user_id',
        'reason',
        'other_text',
    ];

    public function comment(): BelongsTo
    {
        return $this->belongsTo(Comment::class);
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public static function reasonLabel(string $reason): string
    {
        return config("comment_moderation.report_reasons.{$reason}", $reason);
    }
}
