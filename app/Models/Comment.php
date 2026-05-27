<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Comment extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'comments';
    protected $primaryKey = 'id';

    protected $fillable = [
        'comment_content',
        'user_id',
        'post_id',
        'moderation_status',
        'approved_at',
        'auto_moderation_passed',
        'auto_moderation_reason',
        'auto_moderation_checked_at',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
        'auto_moderation_passed' => 'boolean',
        'auto_moderation_checked_at' => 'datetime',
    ];

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class, 'post_id', 'id');
    }

    /** Лайки комментария (критерий 3.7). */
    public function likes(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'comment_likes')->withTimestamps();
    }
}