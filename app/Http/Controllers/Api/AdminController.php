<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Post;
use App\Models\Comment;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class AdminController extends Controller
{
    // Получить статистику для дашборда
    public function getStats(): JsonResponse
    {
        try {
            $stats = [
                'total_users' => User::withTrashed()->count(),
                'active_users' => User::count(),
                'deleted_users' => User::onlyTrashed()->count(),
                'total_posts' => Post::withTrashed()->count(),
                'active_posts' => Post::count(),
                'deleted_posts' => Post::onlyTrashed()->count(),
                'total_comments' => Comment::withTrashed()->count(),
                'active_comments' => Comment::count(),
                'deleted_comments' => Comment::onlyTrashed()->count(),
            ];
            
            return response()->json($stats);
        } catch (\Exception $e) {
            Log::error('Admin stats error: ' . $e->getMessage());
            return response()->json(['message' => 'Ошибка при загрузке статистики'], 500);
        }
    }

    // Получить всех пользователей (включая удаленных)
    public function getUsers(Request $request): JsonResponse
    {
        try {
            $query = User::with(['roles'])->withTrashed();
            
            // Фильтрация по статусу
            if ($request->has('status')) {
                switch ($request->status) {
                    case 'active':
                        $query->whereNull('deleted_at');
                        break;
                    case 'deleted':
                        $query->whereNotNull('deleted_at');
                        break;
                }
            }
            
            // Поиск по имени или email
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%")
                      ->orWhere('username', 'like', "%{$search}%");
                });
            }
            
            $perPage = $request->get('per_page', 20);
            $users = $query->orderBy('created_at', 'desc')->paginate($perPage);
            
            return response()->json([
                'data' => $users->items(),
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ]);
        } catch (\Exception $e) {
            Log::error('Admin getUsers error: ' . $e->getMessage());
            return response()->json(['message' => 'Ошибка при загрузке пользователей'], 500);
        }
    }
      //Получить детальную информацию о пользователе
    public function getUser(User $user): JsonResponse
    {
        try {
            $user->load([
                'roles', 
                'posts' => function($query) {
                    $query->withTrashed()
                          ->withCount(['likes', 'comments'])
                          ->orderBy('created_at', 'desc')
                          ->limit(10);
                }, 
                'comments' => function($query) {
                    $query->withTrashed()
                          ->with(['post' => function($q) {
                              $q->select('id', 'post_title', 'image_url');
                          }])
                          ->orderBy('created_at', 'desc')
                          ->limit(10);
                }
            ]);
            
            return response()->json($user);
        } catch (\Exception $e) {
            Log::error('Admin getUser error: ' . $e->getMessage());
            return response()->json(['message' => 'Ошибка при загрузке данных пользователя'], 500);
        }
    }
    
     // Удалить пользователя (soft delete)
    public function deleteUser(User $user): JsonResponse
    {
        try {
            if ($user->hasRole('admin')) {
                return response()->json(['message' => 'Нельзя удалить администратора'], 403);
            }
            
            $user->delete();
            
            return response()->json(['message' => 'Пользователь успешно удален']);
        } catch (\Exception $e) {
            Log::error('Admin deleteUser error: ' . $e->getMessage());
            return response()->json(['message' => 'Ошибка при удалении пользователя'], 500);
        }
    }
    
     // Восстановить пользователя
     
    public function restoreUser($id): JsonResponse
    {
        try {
            $user = User::withTrashed()->findOrFail($id);
            $user->restore();
            
            return response()->json(['message' => 'Пользователь успешно восстановлен']);
        } catch (\Exception $e) {
            Log::error('Admin restoreUser error: ' . $e->getMessage());
            return response()->json(['message' => 'Ошибка при восстановлении пользователя'], 500);
        }
    }
    
    // Получить все публикации (включая удаленные)
    public function getPosts(Request $request): JsonResponse
    {
        try {
            $query = Post::with(['author' => function($q) {
                $q->withTrashed();
            }])->withTrashed();
            
            // Исключаем посты удаленных пользователей
            $query->whereHas('author', function($q) {
                $q->whereNull('users.deleted_at');
            });
            
            // Фильтрация по статусу
            if ($request->has('status')) {
                switch ($request->status) {
                    case 'active':
                        $query->whereNull('posts.deleted_at');
                        break;
                    case 'deleted':
                        $query->whereNotNull('posts.deleted_at');
                        break;
                }
            }
            
            // Поиск по заголовку или содержимому
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('post_title', 'like', "%{$search}%")
                      ->orWhere('post_content', 'like', "%{$search}%");
                });
            }
            
            $perPage = $request->get('per_page', 20);
            $posts = $query->orderBy('created_at', 'desc')->paginate($perPage);
            
            return response()->json([
                'data' => $posts->items(),
                'current_page' => $posts->currentPage(),
                'last_page' => $posts->lastPage(),
                'per_page' => $posts->perPage(),
                'total' => $posts->total(),
            ]);
        } catch (\Exception $e) {
            Log::error('Admin getPosts error: ' . $e->getMessage());
            return response()->json(['message' => 'Ошибка при загрузке публикаций'], 500);
        }
    }
     //Удалить публикацию (soft delete)
     
    public function deletePost(Post $post): JsonResponse
    {
        try {
            $post->delete();
            
            return response()->json(['message' => 'Публикация успешно удалена']);
        } catch (\Exception $e) {
            Log::error('Admin deletePost error: ' . $e->getMessage());
            return response()->json(['message' => 'Ошибка при удалении публикации'], 500);
        }
    }
     // Восстановить публикацию
    
    public function restorePost($id): JsonResponse
    {
        try {
            $post = Post::withTrashed()->findOrFail($id);
            $post->restore();
            
            return response()->json(['message' => 'Публикация успешно восстановлена']);
        } catch (\Exception $e) {
            Log::error('Admin restorePost error: ' . $e->getMessage());
            return response()->json(['message' => 'Ошибка при восстановлении публикации'], 500);
        }
    }
    // Получить все комментарии (включая удаленные)
    public function getComments(Request $request): JsonResponse
    {
        try {
            $query = Comment::with([
                'author' => function($q) {
                    $q->withTrashed();
                },
                'post' => function($q) {
                    $q->withTrashed();
                }
            ])->withTrashed();
            
            // Исключаем комментарии удаленных пользователей
            $query->whereHas('author', function($q) {
                $q->whereNull('users.deleted_at');
            });
            
            // Фильтрация по статусу
            if ($request->has('status')) {
                switch ($request->status) {
                    case 'active':
                        $query->whereNull('comments.deleted_at');
                        break;
                    case 'deleted':
                        $query->whereNotNull('comments.deleted_at');
                        break;
                }
            }
            
            // Поиск по содержимому
            if ($request->has('search')) {
                $search = $request->search;
                $query->where('comment_content', 'like', "%{$search}%");
            }
            
            $perPage = $request->get('per_page', 20);
            $comments = $query->orderBy('created_at', 'desc')->paginate($perPage);
            
            return response()->json([
                'data' => $comments->items(),
                'current_page' => $comments->currentPage(),
                'last_page' => $comments->lastPage(),
                'per_page' => $comments->perPage(),
                'total' => $comments->total(),
            ]);
        } catch (\Exception $e) {
            Log::error('Admin getComments error: ' . $e->getMessage());
            return response()->json(['message' => 'Ошибка при загрузке комментариев'], 500);
        }
    }
    
    //Удалить комментарий (soft delete)
     
    public function deleteComment(Comment $comment): JsonResponse
    {
        try {
            $comment->delete();
            
            return response()->json(['message' => 'Комментарий успешно удален']);
        } catch (\Exception $e) {
            Log::error('Admin deleteComment error: ' . $e->getMessage());
            return response()->json(['message' => 'Ошибка при удалении комментария'], 500);
        }
    }
    
    // Восстановить комментарий
 
    public function restoreComment($id): JsonResponse
    {
        try {
            $comment = Comment::withTrashed()->findOrFail($id);
            $comment->restore();
            
            return response()->json(['message' => 'Комментарий успешно восстановлен']);
        } catch (\Exception $e) {
            Log::error('Admin restoreComment error: ' . $e->getMessage());
            return response()->json(['message' => 'Ошибка при восстановлении комментария'], 500);
        }
    }

    //Генерация полного отчета о системе
    public function generateReport()
    {
        try {
            // Собираем все данные
            $stats = [
                'total_users' => User::count(),
                'active_users' => User::whereNull('deleted_at')->count(),
                'deleted_users' => User::onlyTrashed()->count(),
                'total_posts' => Post::count(),
                'active_posts' => Post::whereNull('deleted_at')->count(),
                'deleted_posts' => Post::onlyTrashed()->count(),
                'total_comments' => Comment::count(),
                'active_comments' => Comment::whereNull('deleted_at')->count(),
                'deleted_comments' => Comment::onlyTrashed()->count(),
            ];

            // Получаем детальные данные
            $users = User::withTrashed()->with('roles')->get();
            $posts = Post::withTrashed()->with('author')->get();
            $comments = Comment::withTrashed()->with(['author', 'post'])->get();

            // Формируем CSV
            $csvData = [];
            
            // Заголовок отчета
            $csvData[] = ['ОТЧЕТ О РАБОТЕ ИНФОРМАЦИОННОЙ СИСТЕМЫ'];
            $csvData[] = ['Дата создания отчета:', now()->format('d.m.Y H:i:s')];
            $csvData[] = [''];
            
            // Общая статистика
            $csvData[] = ['ОБЩАЯ СТАТИСТИКА'];
            $csvData[] = [''];
            $csvData[] = ['Показатель', 'Значение'];
            $csvData[] = ['Всего пользователей (за все время)', $stats['total_users']];
            $csvData[] = ['Активных пользователей', $stats['active_users']];
            $csvData[] = ['Удаленных пользователей', $stats['deleted_users']];
            $csvData[] = [''];
            $csvData[] = ['Всего публикаций (за все время)', $stats['total_posts']];
            $csvData[] = ['Активных публикаций', $stats['active_posts']];
            $csvData[] = ['Удаленных публикаций', $stats['deleted_posts']];
            $csvData[] = [''];
            $csvData[] = ['Всего комментариев (за все время)', $stats['total_comments']];
            $csvData[] = ['Активных комментариев', $stats['active_comments']];
            $csvData[] = ['Удаленных комментариев', $stats['deleted_comments']];
            $csvData[] = [''];
            $csvData[] = [''];

            // Детальная информация о пользователях
            $csvData[] = ['ПОЛЬЗОВАТЕЛИ'];
            $csvData[] = [''];
            $csvData[] = ['ID', 'Имя', 'Фамилия', 'Email', 'Username', 'Роль', 'Статус', 'Дата регистрации', 'Дата удаления'];
            
            foreach ($users as $user) {
                $csvData[] = [
                    $user->id,
                    $user->name ?? '',
                    $user->surname ?? '',
                    $user->email,
                    $user->username ?? '',
                    $user->roles->pluck('name')->join(', '),
                    $user->deleted_at ? 'Удален' : 'Активен',
                    $user->created_at->format('d.m.Y H:i'),
                    $user->deleted_at ? $user->deleted_at->format('d.m.Y H:i') : '-'
                ];
            }
            
            $csvData[] = [''];
            $csvData[] = [''];

            // Детальная информация о публикациях
            $csvData[] = ['ПУБЛИКАЦИИ'];
            $csvData[] = [''];
            $csvData[] = ['ID', 'Название', 'Автор', 'Email автора', 'Теги', 'Лайков', 'Комментариев', 'Статус', 'Дата создания', 'Дата удаления'];
            
            foreach ($posts as $post) {
                $csvData[] = [
                    $post->id,
                    $post->title,
                    $post->author ? ($post->author->name . ' ' . ($post->author->surname ?? '')) : 'Неизвестен',
                    $post->author ? $post->author->email : '-',
                    $post->tags ?? '',
                    $post->likes_count ?? 0,
                    $post->comments_count ?? 0,
                    $post->deleted_at ? 'Удален' : 'Активен',
                    $post->created_at->format('d.m.Y H:i'),
                    $post->deleted_at ? $post->deleted_at->format('d.m.Y H:i') : '-'
                ];
            }
            
            $csvData[] = [''];
            $csvData[] = [''];

            // Детальная информация о комментариях
            $csvData[] = ['КОММЕНТАРИИ'];
            $csvData[] = [''];
            $csvData[] = ['ID', 'Текст', 'Автор', 'Email автора', 'Публикация', 'Статус', 'Дата создания', 'Дата удаления'];
            
            foreach ($comments as $comment) {
                $csvData[] = [
                    $comment->id,
                    mb_substr($comment->content, 0, 100) . (mb_strlen($comment->content) > 100 ? '...' : ''),
                    $comment->author ? ($comment->author->name . ' ' . ($comment->author->surname ?? '')) : 'Неизвестен',
                    $comment->author ? $comment->author->email : '-',
                    $comment->post ? mb_substr($comment->post->title, 0, 50) : 'Удалена',
                    $comment->deleted_at ? 'Удален' : 'Активен',
                    $comment->created_at->format('d.m.Y H:i'),
                    $comment->deleted_at ? $comment->deleted_at->format('d.m.Y H:i') : '-'
                ];
            }

            // Создаем CSV файл
            $filename = 'report_' . now()->format('Y-m-d_H-i-s') . '.csv';
            $handle = fopen('php://temp', 'r+');
            
            // Добавляем BOM для корректного отображения UTF-8 в Excel
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF));
            
            foreach ($csvData as $row) {
                fputcsv($handle, $row, ';'); // Используем ; для лучшей совместимости с Excel
            }
            
            rewind($handle);
            $csv = stream_get_contents($handle);
            fclose($handle);

            return response($csv, 200)
                ->header('Content-Type', 'text/csv; charset=UTF-8')
                ->header('Content-Disposition', 'attachment; filename="' . $filename . '"');
                
        } catch (\Exception $e) {
            Log::error('Admin generateReport error: ' . $e->getMessage());
            return response()->json(['message' => 'Ошибка при генерации отчета'], 500);
        }
    }
}