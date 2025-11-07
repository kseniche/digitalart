<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    public function show(User $user, Request $request)
    {
        try {
            $posts = Post::where('user_id', $user->id)
                ->with(['author:id,name,user_surname,avatar'])
                ->latest()
                ->paginate(12);

            // Определяем, подписан ли текущий пользователь (проверяем только активные подписки)
            $isFollowing = false;
            if ($request->user()) {
                $isFollowing = \App\Models\Follower::where('follower_id', $request->user()->id)
                    ->where('following_id', $user->id)
                    ->whereNull('deleted_at')
                    ->exists();
            }

            return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'user_surname' => $user->user_surname,
            'username' => $user->username,
            'email' => $user->email,
            'phone' => $user->phone ?? '',
            'avatar' => $user->avatar_url,
            'bio' => $user->bio ?? '',
            'website' => $user->website ?? '',
            'country' => $user->country ?? '',
            'followers_count' => $user->followers_count,
            'following_count' => $user->following_count,
            'posts_count' => $user->posts_count,
            'is_following' => $isFollowing,
            'posts' => $posts->items()
            ]);
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
                ->with(['author:id,name,user_surname,avatar'])
                ->latest()
                ->paginate(12);
            
            return response()->json($posts);
        } catch (\Throwable $e) {
            Log::error('Ошибка при загрузке постов пользователя', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
            return response()->json(['message' => 'Не удалось загрузить посты'], 500);
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
        \Log::info('НАЧАЛО ОБНОВЛЕНИЯ ПРОФИЛЯ');
        \Log::info('Headers:', $request->headers->all());
        \Log::info('Content-Type:', [$request->header('Content-Type')]);
        \Log::info('Request method:', [$request->method()]);
        
        // Получаем сырые данные из запроса
        $rawContent = $request->getContent();
        \Log::info('Raw content length:', [strlen($rawContent)]);
        \Log::info('Raw content (first 500 chars):', [substr($rawContent, 0, 500)]);
        
        \Log::info('Request all data:', $request->all());
        \Log::info('Request POST data:', $_POST);
        \Log::info('Request FILES data:', $_FILES);
        \Log::info('Request has files:', [$request->hasFile('avatar_file')]);
        \Log::info('All request files:', $request->file());

        // Пробуем получить данные разными способами
        $allInput = $request->all();
        \Log::info('All input data:', $allInput);
        
        // Проверяем отдельные поля
        $fieldsToCheck = ['name', 'email', 'username', 'country', 'website', 'bio'];
        foreach ($fieldsToCheck as $field) {
            \Log::info("Field {$field}:", [$request->input($field)]);
        }

        $data = $request->validate([
            'country' => ['nullable','string','max:255'],
            'website' => ['nullable','string','max:255'],
            'bio' => ['nullable','string'],
            'name' => ['nullable','string','max:255'],
            'user_surname' => ['nullable','string','max:255'],
            'username' => ['nullable','string','max:255'],
            'email' => ['nullable','string','email','max:255'],
            'phone' => ['nullable','string','max:255'],
        ]);

        \Log::info('Данные после валидации:', ['validated_data' => $data]);

        try {
            $user = $request->user();
            
            // Обработка загрузки аватара
            if ($request->hasFile('avatar_file')) {
                $file = $request->file('avatar_file');
                \Log::info('Обновление аватара', [
                    'file_name' => $file->getClientOriginalName(),
                    'file_size' => $file->getSize()
                ]);
                
                // Удаляем старый аватар
                if ($user->avatar && !str_starts_with($user->avatar, 'http')) {
                    Storage::disk('s3')->delete($user->avatar);
                }
                
                // Загружаем новый аватар
                $filename = 'avatar_' . time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
                $uploaded = Storage::disk('s3')->putFileAs('avatars', $file, $filename, 'public');
                Storage::disk('s3')->setVisibility($uploaded, 'public');
                
                $data['avatar'] = $uploaded;
                \Log::info('Аватар загружен', ['avatar_path' => $uploaded]);
            }

            \Log::info('Обновление пользователя с данными:', $data);
            $user->update($data);

            \Log::info('Профиль успешно обновлен', [
                'user_id' => $user->id,
                'updated_fields' => array_keys($data)
            ]);

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
            // Удаляем посты (с изображениями уже удалили выше)
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
