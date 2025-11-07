<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Comment;
use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CommentController extends Controller
{
    public function store(Request $request, Post $post)
    {
        $data = $request->validate([
            'content' => ['required', 'string'],
        ], [
            'content.required' => 'Содержание комментария обязательно',
            'content.string' => 'Содержание комментария должно быть строкой'
        ]);

        try {
            $comment = Comment::create([
                'comment_content' => $data['content'],
                'user_id' => $request->user()->id,
                'post_id' => $post->id,
            ]);

            $post->increment('comment_count');

            // Загружаем автора с аватаром
            $comment->load('author:id,name,user_surname,avatar');

            return response()->json([
                'message' => 'Комментарий добавлен',
                'comment' => [
                    'id' => $comment->id,
                    'content' => $comment->comment_content,
                    'author' => [
                        'id' => $comment->author->id,
                        'name' => $comment->author->name,
                        'surname' => $comment->author->user_surname,
                        'avatar' => $comment->author->avatar,
                    ],
                    'created_at' => $comment->created_at
                ]
            ], 201);
        } catch (\Throwable $e) {
            Log::error('Ошибка при создании комментария', [
                'post_id' => $post->id,
                'user_id' => $request->user()->id,
                'error' => $e->getMessage(),
            ]);
            return response()->json(['message' => 'Не удалось добавить комментарий'], 500);
        }
    }

    public function destroy(Comment $comment, Request $request)
    {
        try {
            // Проверяем права
            if ($comment->user_id !== $request->user()->id && !$request->user()->hasRole('admin')) {
                return response()->json(['message' => 'Недостаточно прав'], 403);
            }

            $post = $comment->post;
            $comment->delete();

            // Обновляем счетчик комментариев
            $post->decrement('comment_count');

            return response()->json([
                'message' => 'Комментарий удален'
            ], 200);

        } catch (\Throwable $e) {
            Log::error('Ошибка при удалении комментария', [
                'comment_id' => $comment->id,
                'error' => $e->getMessage(),
            ]);
            return response()->json(['message' => 'Не удалось удалить комментарий'], 500);
        }
    }
}