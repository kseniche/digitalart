<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CategoryController extends Controller
{
    /**
     * Список категорий для выбора при создании/редактировании поста (критерий 3.2).
     * GET /api/categories
     */
    public function index()
    {
        return Category::withCount(['posts as posts_count' => function ($q) {
                $q->withTrashed();
            }])
            ->orderBy('name')
            ->get(['id', 'name']);
    }

    /**
     * Создание категории (только для администратора). Критерий 3.2.2.
     * POST /api/admin/categories
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255|unique:categories,name',
        ], [
            'name.required' => 'Название категории обязательно',
            'name.unique' => 'Категория с таким названием уже существует',
        ]);

        $category = Category::create(['name' => trim($data['name'])]);

        return response()->json([
            'message' => 'Категория создана',
            'category' => ['id' => $category->id, 'name' => $category->name],
        ], 201);
    }

    /**
     * Обновление категории. PUT /api/admin/categories/{category}
     */
    public function update(Request $request, Category $category): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255|unique:categories,name,' . $category->id,
        ], [
            'name.required' => 'Название категории обязательно',
            'name.unique' => 'Категория с таким названием уже существует',
        ]);

        $category->update(['name' => trim($data['name'])]);

        return response()->json([
            'message' => 'Категория обновлена',
            'category' => ['id' => $category->id, 'name' => $category->name],
        ]);
    }

    /**
     * Удаление категории (если нет постов с этой категорией). DELETE /api/admin/categories/{category}
     */
    public function destroy(Category $category): JsonResponse
    {
        if (Post::withTrashed()->where('category_id', $category->id)->exists()) {
            return response()->json([
                'message' => 'Нельзя удалить категорию: к ней привязаны публикации',
            ], 422);
        }

        $category->delete();
        return response()->json(['message' => 'Категория удалена']);
    }
}
