<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\FeedController;
use App\Http\Controllers\Api\PostController;
use App\Http\Controllers\Api\CommentController;
use App\Http\Controllers\Api\LikeController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\FollowController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;

// ПУБЛИЧНЫЕ МАРШРУТЫ (доступны без аутентификации)

// Лента и публикации (публичные)
Route::get('/feed', [FeedController::class, 'index']);
Route::get('/posts', [FeedController::class, 'index']); // дублирует /feed для совместимости
Route::get('/posts/{id}', [PostController::class, 'show']);
Route::get('/profiles/{user}', [ProfileController::class, 'show']);
Route::get('/profiles/{user}/posts', [ProfileController::class, 'posts']);

//  Аутентификация
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

//  ЗАЩИЩЕННЫЕ МАРШРУТЫ (требуют аутентификации)
Route::middleware('auth:sanctum')->group(function () {
    // Пользователь
    Route::get('/user', function (Request $request) {
        // Правильно загружаем роли с именем
        $user = $request->user()->load('roles:name');
        
        \Log::info('=== API USER ROLES DEBUG ===');
        \Log::info('User ID: ' . $user->id);
        \Log::info('Roles loaded: ' . json_encode($user->roles));
        \Log::info('Role names: ' . $user->getRoleNames());
        \Log::info('Has admin: ' . ($user->hasRole('admin') ? 'YES' : 'NO'));
        
        return response()->json([
            'user' => $user,
            'avatar_url' => $user->avatar_url
        ]);
    });
    
    Route::post('/logout', [AuthController::class, 'logout']);

    // Публикации
    Route::post('/posts', [PostController::class, 'store']);
    Route::put('/posts/{post}', [PostController::class, 'update']); // Редактирование публикации
    Route::delete('/posts/{post}', [PostController::class, 'destroy']);

    // Лайки и комментарии
    Route::post('/posts/{post}/comments', [CommentController::class, 'store']);
    Route::delete('/comments/{comment}', [CommentController::class, 'destroy']); // Удаление комментариев
    Route::post('/posts/{post}/like', [LikeController::class, 'toggle']);

    // Профиль
    Route::get('/profile', [ProfileController::class, 'showCurrent']); // Текущий профиль
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::post('/profile/avatar', [ProfileController::class, 'updateAvatar']); // Обновление аватара
    Route::delete('/profile', [ProfileController::class, 'destroy']); // Удаление профиля

    // Подписки
    Route::post('/users/{user}/follow', [FollowController::class, 'toggle']);
    Route::get('/users/{user}/follow-status', [FollowController::class, 'check']); // Проверка статуса подписки
    
    //  АДМИН ПАНЕЛЬ
    Route::prefix('admin')->middleware('admin')->group(function () {
        // Статистика
        Route::get('/stats', [AdminController::class, 'getStats']);
        
        // Отчет
        Route::get('/report', [AdminController::class, 'generateReport']);
        
        // Управление пользователями
        Route::get('/users', [AdminController::class, 'getUsers']);
        Route::get('/users/{user}', [AdminController::class, 'getUser']);
        Route::delete('/users/{user}', [AdminController::class, 'deleteUser']);
        Route::post('/users/{id}/restore', [AdminController::class, 'restoreUser']);
        
        // Управление публикациями
        Route::get('/posts', [AdminController::class, 'getPosts']);
        Route::delete('/posts/{post}', [AdminController::class, 'deletePost']);
        Route::post('/posts/{id}/restore', [AdminController::class, 'restorePost']);
        
        // Управление комментариями
        Route::get('/comments', [AdminController::class, 'getComments']);
        Route::delete('/comments/{comment}', [AdminController::class, 'deleteComment']);
        Route::post('/comments/{id}/restore', [AdminController::class, 'restoreComment']);
    });
});

// Обработка несуществующих API маршрутов (404)
Route::fallback(function () {
    return response()->json([
        'message' => 'API endpoint not found. Check your route definition.',
        'available_endpoints' => [
            'GET /api/feed',
            'GET /api/posts/{id}',
            'POST /api/login',
            'POST /api/register',
            'GET /api/profiles/{id}',
        ]
    ], 404);
});