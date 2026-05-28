<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
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
        'admin_reviewed_at',
        'is_hidden',
        'hidden_at',
        'auto_moderation_passed',
        'auto_moderation_reason',
        'auto_moderation_checked_at',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
        'admin_reviewed_at' => 'datetime',
        'is_hidden' => 'boolean',
        'hidden_at' => 'datetime',
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

    public function reports(): HasMany
    {
        return $this->hasMany(CommentReport::class);
    }

    public function scopePubliclyVisible($query)
    {
        return $query
            ->where('moderation_status', 'approved')
            ->where('is_hidden', false)
            ->whereNull('deleted_at');
    }

    public function isVisibleOnSite(): bool
    {
        return $this->moderation_status === 'approved'
            && ! $this->is_hidden
            && $this->deleted_at === null;
    }
}