<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Country;
use App\Models\Post;
use App\Models\User;
use App\Rules\PersonNameLetters;
use App\Rules\InternationalPhone;
use App\Rules\WebsiteUrl;
use App\Support\PhoneHelper;
use App\Support\WebsiteHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    public function show(User $user, Request $request)
    {
        try {
            $user->load('countryModel');
            $currentUser = $request->user();
            $isOwner = $currentUser && $currentUser->id === $user->id;
            $posts = Post::where('user_id', $user->id)
                ->where('is_draft', false)
                ->where('moderation_status', 'approved')
                ->where(function ($q) {
                    $q->whereNull('published_at')->orWhere('published_at', '<=', now());
                })
                ->with(['author:id,name,user_surname,avatar'])
                ->latest()
                ->paginate(12);

            // Определяем, подписан ли текущий пользователь (проверяем только активные подписки)
            $isFollowing = false;
            if ($currentUser) {
                $isFollowing = \App\Models\Follower::where('follower_id', $currentUser->id)
                    ->where('following_id', $user->id)
                    ->whereNull('deleted_at')
                    ->exists();
            }

            $payload = [
                'id' => $user->id,
                'name' => $user->name,
                'user_surname' => $user->user_surname,
                'username' => $user->username,
                'phone' => $user->phone ?? '',
                'avatar' => $user->avatar_url,
                'bio' => $user->bio ?? '',
                'website' => $user->website ?? '',
                'country' => $user->countryLabel(),
                'followers_count' => $user->followers_count,
                'following_count' => $user->following_count,
                'posts_count' => Post::query()
                    ->where('user_id', $user->id)
                    ->where('is_draft', false)
                    ->where('moderation_status', 'approved')
                    ->where(function ($q) {
                        $q->whereNull('published_at')->orWhere('published_at', '<=', now());
                    })
                    ->count(),
                'is_following' => $isFollowing,
                'is_banned' => (bool) $user->is_banned,
                'posts' => $posts->items(),
            ];
            if ($user->is_banned && !empty($user->ban_reason)) {
                $payload['ban_reason'] = $user->ban_reason;
            }
            if ($isOwner) {
                $payload['email'] = $user->email;
                $payload['email_notifications_enabled'] = (bool) $user->email_notifications_enabled;
                $payload['country_id'] = $user->country_id;
            }

            return response()->json($payload);
        } catch (\Throwable $e) {
            Log::error('Ошибка при загрузке профиля', [
                'profile_user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
            return response()->json(['message' => 'Не удалось загрузить профиль'], 500);
        }
    }

    public function posts(User $user)
    {
        try {
            $posts = Post::where('user_id', $user->id)
                ->where('is_draft', false)
                ->where('moderation_status', 'approved')
                ->where(function ($q) {
                    $q->whereNull('published_at')->orWhere('published_at', '<=', now());
                })
                ->with(['author:id,name,user_surname,avatar', 'category:id,name'])
                ->latest()
                ->paginate(12);

            $posts->getCollection()->transform(function ($post) {
                $post->setAttribute('category', $post->category?->name);
                return $post;
            });

            return response()->json($posts);
        } catch (\Throwable $e) {
            Log::error('Ошибка при загрузке постов пользователя', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
            return response()->json(['message' => 'Не удалось загрузить посты'], 500);
        }
    }

    /**
     * Черновики текущего пользователя. GET /api/profile/drafts
     */
    public function drafts(Request $request)
    {
        try {
            $posts = Post::where('user_id', $request->user()->id)
                ->where('is_draft', true)
                ->with(['author:id,name,user_surname,avatar', 'category:id,name'])
                ->latest()
                ->paginate(12, ['*'], 'page', $request->input('page', 1));

            $posts->getCollection()->transform(function ($post) {
                $post->setAttribute('category', $post->category?->name);
                return $post;
            });

            return response()->json([
                'data' => $posts->items(),
                'current_page' => $posts->currentPage(),
                'last_page' => $posts->lastPage(),
                'per_page' => $posts->perPage(),
                'total' => $posts->total(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Ошибка при загрузке черновиков', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Не удалось загрузить черновики'], 500);
        }
    }

    /**
     * Публикации текущего пользователя, находящиеся на модерации.
     * status=pending|rejected
     */
    public function moderationPosts(Request $request)
    {
        try {
            $status = $request->input('status', 'pending');
            $allowed = ['pending', 'rejected'];
            if (!in_array($status, $allowed, true)) {
                $status = 'pending';
            }

            $posts = Post::where('user_id', $request->user()->id)
                ->where('is_draft', false)
                ->where('moderation_status', $status)
                ->with(['author:id,name,user_surname,avatar', 'category:id,name'])
                ->latest()
                ->paginate(12, ['*'], 'page', $request->input('page', 1));

            $posts->getCollection()->transform(function ($post) {
                $post->setAttribute('category', $post->category?->name);
                return $post;
            });

            return response()->json([
                'data' => $posts->items(),
                'current_page' => $posts->currentPage(),
                'last_page' => $posts->lastPage(),
                'per_page' => $posts->perPage(),
                'total' => $posts->total(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Ошибка при загрузке публикаций модерации', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Не удалось загрузить публикации модерации'], 500);
        }
    }

    public function showCurrent(Request $request)
    {
        return $this->show($request->user(), $request);
    }

    public function updateAvatar(Request $request)
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg|max:2048',
        ]);

        try {
            $user = $request->user();
            
            // Удаляем старый аватар
            if ($user->avatar && !str_starts_with($user->avatar, 'http')) {
                Storage::disk('s3')->delete($user->avatar);
            }
            
            // Загружаем новый
            $filename = 'avatar_' . time() . '_' . uniqid() . '.' . $request->file('avatar')->getClientOriginalExtension();
            $avatarPath = 'avatars/' . $filename;
            
            $uploaded = Storage::disk('s3')->putFileAs('avatars', $request->file('avatar'), $filename, 'public');
            Storage::disk('s3')->setVisibility($uploaded, 'public');
            
            $user->update(['avatar' => $uploaded]);

            return response()->json([
                'message' => 'Аватар обновлен',
                'avatar_url' => $user->avatar_url
            ]);

        } catch (\Throwable $e) {
            Log::error('Ошибка при обновлении аватара', [
                'user_id' => $request->user()->id,
                'error' => $e->getMessage(),
            ]);
            return response()->json(['message' => 'Не удалось обновить аватар'], 500);
        }
    }

    public function update(Request $request)
    {
        $user = $request->user();

        if ($request->has('name')) {
            $request->merge(['name' => trim((string) $request->input('name'))]);
        }
        if ($request->has('user_surname')) {
            $request->merge(['user_surname' => trim((string) $request->input('user_surname'))]);
        }

        $data = $request->validate([
            'country_id' => ['nullable', 'integer', 'exists:countries,id'],
            'country' => ['nullable', 'string', 'max:255'],
            'bio' => ['nullable', 'string', 'max:'.(int) config('field_limits.profile.bio.max', 2000)],
            'name' => ['sometimes', 'required', 'string', 'max:255', new PersonNameLetters],
            'user_surname' => ['sometimes', 'nullable', 'string', 'max:255', new PersonNameLetters(allowEmpty: true)],
            'username' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('users', 'username')->ignore($user->id),
            ],
            'email' => [
                'nullable',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'phone' => ['nullable', 'string', 'max:16', new InternationalPhone],
            'website' => ['nullable', 'string', 'max:255', new WebsiteUrl],
            'email_notifications_enabled' => ['nullable','boolean'],
            'avatar_file' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:2048'],
        ]);

        try {
            if (array_key_exists('phone', $data)) {
                $data['phone'] = PhoneHelper::normalize($data['phone'] ?? '') ?? '';
            }
            if (array_key_exists('website', $data)) {
                $data['website'] = WebsiteHelper::normalize($data['website'] ?? '') ?? '';
            }

            $data = $this->normalizeCountryFields($data);

            // Обработка загрузки аватара
            if ($request->hasFile('avatar_file')) {
                $file = $request->file('avatar_file');
                
                // Удаляем старый аватар
                if ($user->avatar && !str_starts_with($user->avatar, 'http')) {
                    Storage::disk('s3')->delete($user->avatar);
                }
                
                // Загружаем новый аватар
                $filename = 'avatar_' . time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
                $uploaded = Storage::disk('s3')->putFileAs('avatars', $file, $filename, 'public');
                Storage::disk('s3')->setVisibility($uploaded, 'public');
                
                $data['avatar'] = $uploaded;
            }

            $user->update($data);

            return response()->json([
                'message' => 'Профиль обновлен',
                'user' => $user->fresh()
            ]);
        } catch (\Throwable $e) {
            \Log::error('Ошибка при обновлении профиля', [
                'user_id' => $request->user()->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['message' => 'Не удалось обновить профиль'], 500);
        }
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function normalizeCountryFields(array $data): array
    {
        if (array_key_exists('country_id', $data)) {
            $countryId = $data['country_id'];
            if ($countryId) {
                $country = Country::query()->find($countryId);
                $data['country'] = $country?->name_ru;
            } else {
                $data['country'] = null;
            }

            return $data;
        }

        if (array_key_exists('country', $data)) {
            $name = trim((string) ($data['country'] ?? ''));
            if ($name === '') {
                $data['country_id'] = null;
                $data['country'] = null;

                return $data;
            }

            $country = Country::query()
                ->whereRaw('LOWER(name_ru) = ?', [mb_strtolower($name)])
                ->first();

            if ($country) {
                $data['country_id'] = $country->id;
                $data['country'] = $country->name_ru;
            }
        }

        return $data;
    }

    /**
     * Безвозвратное удаление профиля пользователя
     * Удаляет все данные пользователя: посты, комментарии, лайки, подписки, файлы из S3
     */
    public function destroy(Request $request)
    {
        try {
            $user = $request->user();
            $userId = $user->id;
            
            Log::info('Начало безвозвратного удаления профиля', [
                'user_id' => $userId,
                'email' => $user->email,
            ]);

            // 1. Удаляем аватар из S3
            if ($user->avatar && !str_starts_with($user->avatar, 'http')) {
                try {
                    Storage::disk('s3')->delete($user->avatar);
                    Log::info('Аватар удален из S3', ['avatar_path' => $user->avatar]);
                } catch (\Exception $e) {
                    Log::warning('Не удалось удалить аватар из S3', [
                        'avatar_path' => $user->avatar,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            // 2. Удаляем все изображения постов пользователя из S3
            $posts = Post::withTrashed()->where('user_id', $userId)->get();
            foreach ($posts as $post) {
                if ($post->media_path && !str_starts_with($post->media_path, 'http')) {
                    try {
                        Storage::disk('s3')->delete($post->media_path);
                        Log::info('Изображение поста удалено из S3', [
                            'post_id' => $post->id,
                            'media_path' => $post->media_path,
                        ]);
                    } catch (\Exception $e) {
                        Log::warning('Не удалось удалить изображение поста из S3', [
                            'post_id' => $post->id,
                            'media_path' => $post->media_path,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            }

            // 3. Удаляем все токены Sanctum
            $user->tokens()->delete();
            Log::info('Все токены пользователя удалены');

            // 4. Безвозвратно удаляем все связанные записи
            Post::withTrashed()->where('user_id', $userId)->forceDelete();
            
            // Удаляем комментарии
            \App\Models\Comment::withTrashed()->where('user_id', $userId)->forceDelete();
            
            // Удаляем лайки
            \App\Models\Like::withTrashed()->where('user_id', $userId)->forceDelete();
            
            // Удаляем связи подписок (где пользователь подписчик)
            \App\Models\Follower::withTrashed()->where('follower_id', $userId)->forceDelete();
            
            // Удаляем связи подписок (где пользователь автор)
            \App\Models\Follower::withTrashed()->where('following_id', $userId)->forceDelete();

            // 5. Безвозвратно удаляем самого пользователя
            $user->forceDelete();

            Log::info('Профиль пользователя безвозвратно удален', [
                'user_id' => $userId,
            ]);

            return response()->json([
                'message' => 'Профиль успешно удален'
            ], 200);

        } catch (\Throwable $e) {
            Log::error('Ошибка при безвозвратном удалении профиля', [
                'user_id' => optional($request->user())->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'message' => 'Не удалось удалить профиль'
            ], 500);
        }
    }
}
