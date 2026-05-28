<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;
use Illuminate\Database\Eloquent\SoftDeletes;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens, HasRoles, SoftDeletes; 

    protected $fillable = [
        'name',
        'email',
        'password',
        'username',
        'user_surname',
        'phone',
        'avatar',
        'country',
        'website',
        'bio',
        'is_banned',
        'ban_reason',
        'email_notifications_enabled',
        'terms_accepted_at',
        'comment_rules_accepted_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $appends = [
        'avatar_url',
        'followers_count',
        'following_count',
        'posts_count',
        'full_name',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_banned' => 'boolean',
            'email_notifications_enabled' => 'boolean',
            'terms_accepted_at' => 'datetime',
            'comment_rules_accepted_at' => 'datetime',
        ];
    }

    /**
     * Boot method для автоматической инициализации
     */
    protected static function boot()
    {
        parent::boot();

        // Каскадное мягкое удаление: при удалении пользователя удаляем все его связанные записи
        static::deleted(function ($user) {
            // Удаляем все посты пользователя
            $user->posts()->delete();
            
            // Удаляем все комментарии пользователя
            $user->comments()->delete();
            
            // Удаляем все лайки пользователя
            $user->likes()->delete();
            
            // Удаляем все связи подписок (follower/following)
            $user->followers()->delete();
            $user->following()->delete();
        });

        // Каскадное восстановление: при восстановлении пользователя восстанавливаем все его связанные записи
        static::restored(function ($user) {
            // Восстанавливаем все посты пользователя
            $user->posts()->onlyTrashed()->restore();
            
            // Восстанавливаем все комментарии пользователя
            $user->comments()->onlyTrashed()->restore();
            
            // Восстанавливаем все лайки пользователя
            $user->likes()->onlyTrashed()->restore();
            
            // Восстанавливаем все связи подписок
            $user->followers()->onlyTrashed()->restore();
            $user->following()->onlyTrashed()->restore();
        });
    }
    public function posts()
    {
        return $this->hasMany(Post::class, 'user_id');
    }

    public function comments()
    {
        return $this->hasMany(Comment::class, 'user_id');
    }

    public function likes()
    {
        return $this->hasMany(Like::class, 'user_id');
    }

    public function followers()
    {
        return $this->hasMany(Follower::class, 'following_id');
    }

    public function following()
    {
        return $this->hasMany(Follower::class, 'follower_id');
    }

    /** Избранные посты (критерий 3.8). */
    public function favorites()
    {
        return $this->belongsToMany(Post::class, 'favorites')->withTimestamps();
    }

    // Accessors для вычисляемых полей
    public function getFollowersCountAttribute()
    {
        // Если поле уже загружено (например, через join), используем его
        if (array_key_exists('followers_count', $this->attributes)) {
            return $this->attributes['followers_count'];
        }
        return $this->followers()->count();
    }

    public function getFollowingCountAttribute()
    {
        if (array_key_exists('following_count', $this->attributes)) {
            return $this->attributes['following_count'];
        }
        return $this->following()->count();
    }

    public function getPostsCountAttribute()
    {
        if (array_key_exists('posts_count', $this->attributes)) {
            return $this->attributes['posts_count'];
        }

        return $this->publishedPosts()->count();
    }

    /**
     * Опубликованные работы в портфолио (как в ProfileController).
     */
    public function publishedPosts()
    {
        return $this->posts()
            ->where('is_draft', false)
            ->where('moderation_status', 'approved')
            ->where(function ($q) {
                $q->whereNull('published_at')->orWhere('published_at', '<=', now());
            });
    }

    public function getFullNameAttribute(): string
    {
        return trim($this->name . ' ' . ($this->user_surname ?? ''));
    }

    public function getAvatarUrlAttribute(): ?string
    {
        if (empty($this->avatar)) {
            return null;
        }
        // Локальный fallback не отдавать как S3 URL (избегаем 404 на default-avatar.svg в бакете)
        if ($this->avatar === 'default-avatar.svg' || str_ends_with($this->avatar, '/default-avatar.svg')) {
            return null;
        }
        
        // Если avatar уже абсолютный URL, возвращаем как есть
        if (str_starts_with($this->avatar, 'http')) {
            return $this->avatar;
        }
        
        // Генерируем URL для S3
        try {
            $s3Config = config('filesystems.disks.s3');
            
            // Используем публичный URL 
            $publicUrl = env('AWS_PUBLIC_URL');
            if ($publicUrl) {
                return rtrim($publicUrl, '/') . '/' . ltrim($this->avatar, '/');
            }
            
            // Fallback: формируем URL из endpoint и bucket
            $baseUrl = $s3Config['url'] ?? ($s3Config['endpoint'] . '/' . $s3Config['bucket']);
            $url = rtrim($baseUrl, '/') . '/' . ltrim($this->avatar, '/');
            return $url;
        } catch (\Exception $e) {
            \Log::error('Ошибка при генерации avatar URL', [
                'user_id' => $this->id,
                'avatar_path' => $this->avatar,
                'error' => $e->getMessage(),
            ]);
            return $this->avatar;
        }
    }

    /**
     * Мутатор для avatar - сохраняем только путь, без полного URL
     */
    public function setAvatarAttribute($value)
    {
        if (empty($value)) {
            $this->attributes['avatar'] = null;
            return;
        }

        // Если пришел полный URL, извлекаем только путь
        if (str_starts_with($value, 'http')) {
            $parsed = parse_url($value);
            $this->attributes['avatar'] = ltrim($parsed['path'] ?? '', '/');
        } else {
            $this->attributes['avatar'] = $value;
        }
    }

    /**
     * Scope для поиска пользователей
     */
    public function scopeSearch($query, $searchTerm)
    {
        if (empty($searchTerm)) {
            return $query;
        }

        return $query->where(function ($q) use ($searchTerm) {
            $q->where('name', 'like', "%{$searchTerm}%")
              ->orWhere('user_surname', 'like', "%{$searchTerm}%")
              ->orWhere('username', 'like', "%{$searchTerm}%")
              ->orWhere('email', 'like', "%{$searchTerm}%");
        });
    }

    /**
     * Scope для загрузки только необходимых данных профиля
     */
    public function scopeForProfile($query)
    {
        return $query->select([
            'id',
            'name',
            'user_surname', 
            'username',
            'email',
            'password',
            'avatar',
            'country',
            'website',
            'bio',
            'phone',
            'created_at'
        ]);
    }

    /**
     * Проверяет, подписан ли текущий пользователь на другого пользователя
     */
    public function isFollowing(User $user): bool
    {
        if (!$this->relationLoaded('following')) {
            // Проверяем только активные подписки (без мягко удаленных)
            return Follower::where('follower_id', $this->id)
                ->where('following_id', $user->id)
                ->whereNull('deleted_at')
                ->exists();
        }

        // Если отношения загружены, проверяем только активные подписки
        return $this->following()
            ->where('following_id', $user->id)
            ->whereNull('deleted_at')
            ->exists();
    }

    /**
     * Проверяет, подписан ли другой пользователь на текущего
     */
    public function isFollowedBy(User $user): bool
    {
        if (!$this->relationLoaded('followers')) {
            // Проверяем только активные подписки (без мягко удаленных)
            return Follower::where('follower_id', $user->id)
                ->where('following_id', $this->id)
                ->whereNull('deleted_at')
                ->exists();
        }

        // Если отношения загружены, проверяем только активные подписки
        return $this->followers()
            ->where('follower_id', $user->id)
            ->whereNull('deleted_at')
            ->exists();
    }

    /**
     * Получает рекомендуемых пользователей для подписки
     */
    public function getSuggestedUsers($limit = 5)
    {
        $followingIds = $this->following()->pluck('following_id');
        $followingIds[] = $this->id; // Исключаем себя

        return User::whereNotIn('id', $followingIds)
            ->inRandomOrder()
            ->limit($limit)
            ->get(['id', 'name', 'user_surname', 'username', 'avatar']);
    }
}