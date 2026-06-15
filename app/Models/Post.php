<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Database\Eloquent\SoftDeletes;

class Post extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'posts';
    protected $primaryKey = 'id';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'post_title',
        'post_content',
        'media_path',
        'tags',
        'user_id', 
        'media_type',
        'like_count',
        'comment_count',
        'view_count',
        'category_id',
        'is_draft',
        'published_at',
        'moderation_status',
        'approved_at',
        'moderation_rejection_reason',
        'auto_moderation_passed',
        'auto_moderation_reason',
        'auto_moderation_checked_at',
    ];

    protected $appends = [
        'image_url',
        'optimized_image_url', //  Оптимизированнпя версию
        'thumbnail_url', // Маленькая версия для превью
    ];

    protected $casts = [
        'tags' => 'array',
        'is_draft' => 'boolean',
        'published_at' => 'datetime',
        'approved_at' => 'datetime',
        'auto_moderation_passed' => 'boolean',
        'auto_moderation_checked_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Связи
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id', 'id');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class, 'post_id', 'id');
    }

    public function likes(): HasMany
    {
        return $this->hasMany(Like::class, 'post_id', 'id');
    }

    /** Пользователи, добавившие пост в избранное (критерий 3.8). */
    public function favoredBy(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'favorites')->withTimestamps();
    }

    public function reports(): HasMany
    {
        return $this->hasMany(PostReport::class, 'post_id', 'id');
    }

    public function hasConfirmedReport(): bool
    {
        return $this->reports()
            ->where('status', \App\Enums\PostReportStatus::Confirmed)
            ->exists();
    }

    /**
     * Accessor для image_url (оригинальное изображение)
     * С кэшированием на 1 час для производительности
     */
    public function getImageUrlAttribute(): ?string
    {
        if (empty($this->media_path)) {
            return '/images/digital-art-1.jpg'; // Fallback изображение
        }

        // Кэшируем URL на 1 час для избежания повторных вычислений
        return Cache::remember("post_image_url_{$this->id}", 3600, function () {
            return $this->generateOptimizedS3Url($this->media_path);
        });
    }

    /**
     * Accessor для optimized_image_url (оптимизированная версия)
     * Для использования в ленте и списках
     */
    public function getOptimizedImageUrlAttribute(): ?string
    {
        if (empty($this->media_path)) {
            return '/images/digital-art-1.jpg';
        }

        return Cache::remember("post_optimized_image_url_{$this->id}", 3600, function () {
            return $this->generateOptimizedS3Url($this->media_path);
        });
    }

    /**
     * Accessor для thumbnail_url (миниатюра)
     * Для превью и lazy loading
     */
    public function getThumbnailUrlAttribute(): ?string
    {
        if (empty($this->media_path)) {
            return '/images/digital-art-1.jpg'; // Маленький placeholder
        }

        return Cache::remember("post_thumbnail_url_{$this->id}", 3600, function () {
            // Если есть возможность генерировать превью на лету - используем параметры
            // Иначе возвращаем оригинальный URL с пометкой для lazy loading
            return $this->generateOptimizedS3Url($this->media_path) . '?thumb=true';
        });
    }

    /**
     * Оптимизированная генерация S3 URL с обработкой ошибок
     */
    private function generateOptimizedS3Url($path): ?string
    {
        if (empty($path)) {
            return null;
        }
    
        // Если уже абсолютный URL - возвращаем как есть
        if (str_starts_with($path, 'http')) {
            return $path;
        }
    
        try {
            if (Storage::disk('public')->exists($path)) {
                return Storage::disk('public')->url($path);
            }

            $basename = basename($path);
            $localImagesPath = 'images/' . $basename;
            if (Storage::disk('public')->exists($localImagesPath)) {
                return Storage::disk('public')->url($localImagesPath);
            }
            if (is_file(public_path('images/' . $basename))) {
                return '/images/' . $basename;
            }

            // 1. Используем публичный домен из .env 
            $publicBaseUrl = env('AWS_PUBLIC_URL');
            if ($publicBaseUrl) {
                return rtrim($publicBaseUrl, '/') . '/' . ltrim($path, '/');
            }
    
            // 2. Fallback: формируем URL из endpoint и bucket
            $s3Config = config('filesystems.disks.s3');
            if (empty($s3Config)) {
                \Log::warning('S3 configuration not found', ['path' => $path]);
                return Storage::disk('public')->url($path) ?? '/images/digital-art-1.jpg';
            }
    
            $baseUrl = $s3Config['url'] ?? ($s3Config['endpoint'] . '/' . $s3Config['bucket']);
            $url = rtrim($baseUrl, '/') . '/' . ltrim($path, '/');
            
            return $url;
    
        } catch (\Exception $e) {
            \Log::error('Ошибка при генерации S3 URL', [
                'path' => $path,
                'post_id' => $this->id,
                'error' => $e->getMessage(),
            ]);
            
            // Fallback на локальное хранилище
            return Storage::disk('public')->url($path) ?? '/images/digital-art-1.jpg';
        }
    }

    /**
     * Accessor для обратной совместимости
     */
    public function getImagePathAttribute(): ?string
    {
        return $this->getImageUrlAttribute();
    }

    /**
     * Мутатор для media_path - очищаем от полного URL, сохраняем только путь
     */
    public function setMediaPathAttribute($value)
    {
        if (str_starts_with($value, 'http')) {
            $parsed = parse_url($value);
            $this->attributes['media_path'] = ltrim($parsed['path'] ?? '', '/');
        } else {
            $this->attributes['media_path'] = $value;
        }
    }

    /**
     * Посты, видимые в ленте; те же условия — для лайка/избранного (добавление).
     * Согласовано с FeedController::index.
     */
    public function scopePubliclyVisible(Builder $query): Builder
    {
        return $query
            ->where('is_draft', false)
            ->where('moderation_status', 'approved')
            ->where(function ($q) {
                $q->whereNull('published_at')->orWhere('published_at', '<=', now());
            })
            ->whereHas('author', fn ($q) => $q->whereNull('users.deleted_at'));
    }

    /**
     * Доступен ли пост для публичных социальных действий (как в ленте).
     */
    public function isPubliclyVisible(): bool
    {
        if ($this->is_draft) {
            return false;
        }
        if (($this->moderation_status ?? '') !== 'approved') {
            return false;
        }
        if ($this->published_at && $this->published_at->isFuture()) {
            return false;
        }
        $this->loadMissing('author');

        return $this->author !== null;
    }

    /**
     * Scope для оптимизированных запросов - загрузка только нужных данных
     */
    public function scopeForFeed($query)
    {
        return $query->select([
            'id',
            'post_title', 
            'media_path',
            'user_id',
            'like_count',
            'comment_count', 
            'tags',
            'created_at',
            'updated_at'
        ])->with(['author:id,name,user_surname,avatar']);
    }

    /**
     * Scope для поиска с оптимизацией
     */
    public function scopeSearch($query, $searchTerm)
    {
        if (empty($searchTerm)) {
            return $query;
        }

        return $query->where(function ($q) use ($searchTerm) {
            $q->where('post_title', 'like', "%{$searchTerm}%")
              ->orWhere('tags', 'like', "%{$searchTerm}%");
        });
    }

    /**
     * Очистка кэша при обновлении модели
     */
    protected static function boot()
    {
        parent::boot();

        static::updated(function ($post) {
            Cache::forget("post_image_url_{$post->id}");
            Cache::forget("post_optimized_image_url_{$post->id}");
            Cache::forget("post_thumbnail_url_{$post->id}");
        });

        static::deleted(function ($post) {
            Cache::forget("post_image_url_{$post->id}");
            Cache::forget("post_optimized_image_url_{$post->id}");
            Cache::forget("post_thumbnail_url_{$post->id}");
        });
    }

    /**
     * Получение размера изображения 
     */
    public function getImageDimensions(): array
    {
        return [
            'width' => 800,
            'height' => 600,
            'aspect_ratio' => 1.33
        ];
    }
}