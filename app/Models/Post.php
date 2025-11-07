<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
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
    ];

    protected $appends = [
        'image_url',
        'optimized_image_url', //  Оптимизированнпя версию
        'thumbnail_url', // Маленькая версия для превью
    ];

    protected $casts = [
        'tags' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Связи
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class, 'post_id', 'id');
    }

    public function likes(): HasMany
    {
        return $this->hasMany(Like::class, 'post_id', 'id');
    }

    /**
     * Accessor для image_url (оригинальное изображение)
     * С кэшированием на 1 час для производительности
     */
    public function getImageUrlAttribute(): ?string
    {
        if (empty($this->media_path)) {
            return '/images/digital-art-1.svg'; // Fallback изображение
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
            return '/images/digital-art-1.svg';
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
            return '/images/placeholder.svg'; // Маленький placeholder
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
            // 1. Используем публичный домен из .env 
            $publicBaseUrl = env('AWS_PUBLIC_URL');
            if ($publicBaseUrl) {
                return rtrim($publicBaseUrl, '/') . '/' . ltrim($path, '/');
            }
    
            // 2. Fallback: формируем URL из endpoint и bucket
            $s3Config = config('filesystems.disks.s3');
            if (empty($s3Config)) {
                \Log::warning('S3 configuration not found', ['path' => $path]);
                return Storage::disk('public')->url($path) ?? '/images/digital-art-1.svg';
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
            return Storage::disk('public')->url($path) ?? '/images/digital-art-1.svg';
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