<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\FeedController;
use App\Http\Controllers\Api\PostController;
use App\Http\Controllers\Api\CommentController;
use App\Http\Controllers\Api\LikeController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\FollowController;
use App\Http\Controllers\Api\FavoriteController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\RecommendationsController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AdminCommentController;
use App\Http\Controllers\Api\CommentReportController;
use App\Http\Controllers\Api\AuthController;

// ПУБЛИЧНЫЕ МАРШРУТЫ (доступны без аутентификации)

// Лента и публикации (публичные)
Route::get('/feed', [FeedController::class, 'index'])->middleware('optional_sanctum');
Route::get('/posts', [FeedController::class, 'index'])->middleware('optional_sanctum'); // дублирует /feed для совместимости
Route::get('/tags', [FeedController::class, 'tags']);
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/posts/{id}', [PostController::class, 'show'])->middleware('optional_sanctum');
Route::get('/recommendations', [RecommendationsController::class, 'index'])->middleware('optional_sanctum');
Route::get('/profiles/{user}', [ProfileController::class, 'show'])->middleware('optional_sanctum');
Route::get('/profiles/{user}/posts', [ProfileController::class, 'posts']);

//  Аутентификация
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth-login');
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth-register');
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:auth-password');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:auth-password');

//  ЗАЩИЩЕННЫЕ МАРШРУТЫ (требуют аутентификации)
Route::middleware('auth:sanctum')->group(function () {
    // Пользователь
    Route::get('/user', function (Request $request) {
        $user = $request->user()->load('roles:name');

        return response()->json([
            'user' => $user,
            'avatar_url' => $user->avatar_url
        ]);
    });
    
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/user/update-password', [AuthController::class, 'updatePassword'])->middleware('not_banned');
    Route::post('/user/accept-comment-rules', [AuthController::class, 'acceptCommentRules'])->middleware('not_banned');

    // Публикации (создание — только для незаблокированных, критерий 3.6)
    Route::post('/posts', [PostController::class, 'store'])->middleware(['not_banned', 'throttle:content-create']);
    Route::put('/posts/{post}', [PostController::class, 'update'])->middleware('not_banned'); // Редактирование публикации
    Route::delete('/posts/{post}', [PostController::class, 'destroy'])->middleware('not_banned');

    // Лайки и комментарии (только для незаблокированных)
    Route::post('/posts/{post}/comments', [CommentController::class, 'store'])->middleware(['not_banned', 'throttle:content-create']);
    Route::delete('/comments/{comment}', [CommentController::class, 'destroy'])->middleware('not_banned'); // Удаление комментариев
    Route::post('/posts/{post}/like', [LikeController::class, 'toggle'])->middleware(['not_banned', 'throttle:social-actions']);
    Route::post('/comments/{id}/like', [CommentController::class, 'toggleLike'])->middleware(['not_banned', 'throttle:social-actions']);
    Route::get('/comment-report-reasons', [CommentReportController::class, 'reasons']);
    Route::post('/comments/{comment}/report', [CommentReportController::class, 'store'])->middleware(['not_banned', 'throttle:social-actions']);

    // Избранное (критерий 3.8)
    Route::post('/posts/{id}/favorite', [FavoriteController::class, 'toggleFavorite'])->middleware(['not_banned', 'throttle:social-actions']);
    Route::get('/profile/favorites', [FavoriteController::class, 'getMyFavorites']);
    Route::get('/profile/drafts', [ProfileController::class, 'drafts']);
    Route::get('/profile/moderation-posts', [ProfileController::class, 'moderationPosts']);

    // Профиль
    Route::get('/profile', [ProfileController::class, 'showCurrent']); // Текущий профиль
    Route::put('/profile', [ProfileController::class, 'update'])->middleware('not_banned');
    Route::post('/profile/avatar', [ProfileController::class, 'updateAvatar'])->middleware('not_banned'); // Обновление аватара
    Route::delete('/profile', [ProfileController::class, 'destroy'])->middleware('not_banned'); // Удаление профиля

    // Подписки
    Route::post('/users/{user}/follow', [FollowController::class, 'toggle'])->middleware(['not_banned', 'throttle:social-actions']);
    Route::get('/users/{user}/follow-status', [FollowController::class, 'check']);
    Route::get('/users/{user}/followers', [FollowController::class, 'followers']);
    Route::get('/users/{user}/following', [FollowController::class, 'following']);
    
    //  АДМИН ПАНЕЛЬ
    Route::prefix('admin')->middleware(['admin', 'throttle:admin-actions'])->group(function () {
        // Статистика
        Route::get('/stats', [AdminController::class, 'getStats']);
        
        // Отчет
        Route::get('/report', [AdminController::class, 'generateReport']);
        
        // Управление пользователями
        Route::get('/users/stats', [AdminController::class, 'usersStats']);
        Route::get('/users', [AdminController::class, 'getUsers']);
        Route::get('/users/{user}', [AdminController::class, 'getUser']);
        Route::delete('/users/{user}', [AdminController::class, 'deleteUser']);
        Route::post('/users/{id}/restore', [AdminController::class, 'restoreUser']);
        Route::post('/users/{id}/ban', [AdminController::class, 'banUser']);
        Route::post('/users/{id}/unban', [AdminController::class, 'unbanUser']);
        
        // Управление публикациями
        Route::get('/posts/stats', [AdminController::class, 'postsStats']);
        Route::get('/posts', [AdminController::class, 'getPosts']);
        Route::get('/posts/{id}', [AdminController::class, 'getPost']);
        Route::post('/posts/{id}/approve', [AdminController::class, 'approvePost']);
        Route::post('/posts/{id}/reject', [AdminController::class, 'rejectPost']);
        Route::delete('/posts/{post}', [AdminController::class, 'deletePost']);
        Route::post('/posts/{id}/restore', [AdminController::class, 'restorePost']);
        
        // Управление комментариями
        Route::get('/comments/stats', [AdminCommentController::class, 'stats']);
        Route::get('/comments', [AdminCommentController::class, 'index']);
        Route::post('/comments/{id}/confirm', [AdminCommentController::class, 'confirm']);
        Route::post('/comments/{id}/unhide', [AdminCommentController::class, 'unhide']);
        Route::post('/comments/{id}/dismiss-reports', [AdminCommentController::class, 'dismissReports']);
        Route::post('/comments/{id}/delete-with-banned-words', [AdminCommentController::class, 'destroyWithBannedWords']);
        Route::post('/comments/{id}/approve', [AdminCommentController::class, 'approve']);
        Route::delete('/comments/{comment}', [AdminCommentController::class, 'destroy']);

        // Управление словарем автомодерации
        Route::get('/banned-words', [AdminController::class, 'getBannedWords']);
        Route::post('/banned-words', [AdminController::class, 'addBannedWord']);
        Route::delete('/banned-words/{id}', [AdminController::class, 'deleteBannedWord']);

        // Управление категориями (критерий 3.2.2)
        Route::get('/categories', [CategoryController::class, 'index']);
        Route::post('/categories', [CategoryController::class, 'store']);
        Route::put('/categories/{category}', [CategoryController::class, 'update']);
        Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);

        // Теги публикаций (просмотр и удаление связи с постами)
        Route::get('/tags', [AdminController::class, 'getTags']);
        Route::delete('/tags', [AdminController::class, 'deleteTag']);
    });
});

// Обработка несуществующих API маршрутов (404)
Route::fallback(function () {
    if (app()->environment(['local', 'testing']) || config('app.debug')) {
        return response()->json([
            'message' => 'API-метод не найден. Проверьте определение маршрута.',
            'available_endpoints' => [
                'GET /api/feed',
                'GET /api/posts/{id}',
                'POST /api/login',
                'POST /api/register',
                'GET /api/profiles/{id}',
            ]
        ], 404);
    }

    return response()->json([
        'message' => 'Страница не найдена',
    ], 404);
});