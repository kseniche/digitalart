<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Models\User;
use App\Models\Post;
use App\Models\Comment;
use App\Models\Like;
use Illuminate\Foundation\Testing\RefreshDatabase;

/**
 * Модульное тестирование модели Post
 * Проверяет корректность работы методов и связей модели публикации
 */
class PostTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Тест: Создание публикации
     * Проверяет успешное создание записи в БД
     */
    public function test_post_can_be_created(): void
    {
        $user = User::factory()->create();

        $postData = [
            'post_title' => 'Тестовая публикация',
            'post_content' => 'Содержание тестовой публикации',
            'media_path' => 'posts/test.jpg',
            'user_id' => $user->id,
            'tags' => ['digital-art', 'illustration'],
        ];

        $post = Post::create($postData);

        $this->assertDatabaseHas('posts', [
            'post_title' => 'Тестовая публикация',
            'user_id' => $user->id,
        ]);

        $this->assertEquals('Тестовая публикация', $post->post_title);
        $this->assertEquals($user->id, $post->user_id);
    }

    /**
     * Тест: Связь публикации с автором
     * Проверяет работу отношения belongsTo
     */
    public function test_post_belongs_to_author(): void
    {
        $user = User::factory()->create(['name' => 'Автор']);
        $post = Post::factory()->create(['user_id' => $user->id]);

        $this->assertInstanceOf(User::class, $post->author);
        $this->assertEquals('Автор', $post->author->name);
    }

    /**
     * Тест: Подсчет комментариев к публикации
     * Проверяет корректность подсчета связанных комментариев
     */
    public function test_post_comments_count(): void
    {
        $post = Post::factory()->create();
        
        // Создаем 5 комментариев к публикации
        Comment::factory()->count(5)->create(['post_id' => $post->id]);

        $this->assertEquals(5, $post->comments()->count());
    }

    /**
     * Тест: Подсчет лайков к публикации
     * Проверяет корректность подсчета связанных лайков
     */
    public function test_post_likes_count(): void
    {
        $post = Post::factory()->create();
        
        // Создаем 3 лайка к публикации
        Like::factory()->count(3)->create(['post_id' => $post->id]);

        $this->assertEquals(3, $post->likes()->count());
    }

    /**
     * Тест: Soft Delete публикации
     * Проверяет программное удаление публикации
     */
    public function test_post_soft_delete(): void
    {
        $post = Post::factory()->create();
        $postId = $post->id;

        $post->delete();

        $this->assertSoftDeleted('posts', ['id' => $postId]);
        
        $deletedPost = Post::withTrashed()->find($postId);
        $this->assertNotNull($deletedPost);
        $this->assertNotNull($deletedPost->deleted_at);
    }

    /**
     * Тест: Работа с тегами (JSON)
     * Проверяет сохранение и извлечение тегов как массива
     */
    public function test_post_tags_array_cast(): void
    {
        $post = Post::factory()->create([
            'tags' => ['3d-art', 'concept-art', 'digital'],
        ]);

        $this->assertIsArray($post->tags);
        $this->assertCount(3, $post->tags);
        $this->assertContains('3d-art', $post->tags);
    }

    /**
     * Тест: Поиск публикаций по названию
     * Проверяет работу scope Search
     */
    public function test_post_search_scope(): void
    {
        Post::factory()->create(['post_title' => 'Цифровая живопись']);
        Post::factory()->create(['post_title' => 'Концепт-арт персонажа']);
        Post::factory()->create(['post_title' => '3D моделирование']);

        $results = Post::search('цифровая')->get();

        $this->assertCount(1, $results);
        $this->assertEquals('Цифровая живопись', $results->first()->post_title);
    }

    /**
     * Тест: Генерация URL изображения
     * Проверяет accessor для image_url
     */
    public function test_post_image_url_generation(): void
    {
        $post = Post::factory()->create([
            'media_path' => 'posts/artwork.jpg',
        ]);

        $imageUrl = $post->image_url;
        
        $this->assertNotNull($imageUrl);
        $this->assertStringContainsString('posts/artwork.jpg', $imageUrl);
    }

    /**
     * Тест: Восстановление удаленной публикации
     * Проверяет возможность восстановления
     */
    public function test_post_can_be_restored(): void
    {
        $post = Post::factory()->create();
        $postId = $post->id;

        $post->delete();
        $this->assertSoftDeleted('posts', ['id' => $postId]);

        $post->restore();

        $this->assertDatabaseHas('posts', [
            'id' => $postId,
            'deleted_at' => null,
        ]);
    }
}


