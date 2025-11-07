<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Models\User;
use App\Models\Post;
use App\Models\Follower;
use Illuminate\Foundation\Testing\RefreshDatabase;

/**
 * Модульное тестирование модели User
 * Проверяет корректность работы методов и связей модели пользователя
 */
class UserTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Тест: Создание пользователя с корректными данными
     * Проверяет, что пользователь успешно создается в БД
     */
    public function test_user_can_be_created(): void
    {
        $userData = [
            'name' => 'Иван',
            'user_surname' => 'Иванов',
            'email' => 'ivan@example.com',
            'password' => bcrypt('password123'),
            'username' => 'ivan_ivanov',
        ];

        $user = User::create($userData);

        $this->assertDatabaseHas('users', [
            'email' => 'ivan@example.com',
            'username' => 'ivan_ivanov',
        ]);

        $this->assertEquals('Иван', $user->name);
        $this->assertEquals('ivan_ivanov', $user->username);
    }

    /**
     * Тест: Получение полного имени пользователя
     * Проверяет работу accessor getFullNameAttribute
     */
    public function test_user_full_name_attribute(): void
    {
        $user = User::factory()->create([
            'name' => 'Петр',
            'user_surname' => 'Петров',
        ]);

        $this->assertEquals('Петр Петров', $user->full_name);
    }

    /**
     * Тест: Подсчет публикаций пользователя
     * Проверяет корректность подсчета связанных публикаций
     */
    public function test_user_posts_count(): void
    {
        $user = User::factory()->create();
        
        // Создаем 3 публикации для пользователя
        Post::factory()->count(3)->create(['user_id' => $user->id]);

        $this->assertEquals(3, $user->posts()->count());
        $this->assertEquals(3, $user->posts_count);
    }

    /**
     * Тест: Soft Delete пользователя
     * Проверяет, что пользователь удаляется программно (soft delete)
     */
    public function test_user_soft_delete(): void
    {
        $user = User::factory()->create();
        $userId = $user->id;

        $user->delete();

        // Проверяем, что пользователь помечен как удаленный
        $this->assertSoftDeleted('users', ['id' => $userId]);
        
        // Проверяем, что можно найти удаленного пользователя
        $deletedUser = User::withTrashed()->find($userId);
        $this->assertNotNull($deletedUser);
        $this->assertNotNull($deletedUser->deleted_at);
    }

    /**
     * Тест: Восстановление удаленного пользователя
     * Проверяет возможность восстановления soft-deleted записи
     */
    public function test_user_can_be_restored(): void
    {
        $user = User::factory()->create();
        $userId = $user->id;

        $user->delete();
        $this->assertSoftDeleted('users', ['id' => $userId]);

        // Восстанавливаем пользователя
        $user->restore();

        $this->assertDatabaseHas('users', [
            'id' => $userId,
            'deleted_at' => null,
        ]);
    }

    /**
     * Тест: Проверка подписки на другого пользователя
     * Проверяет метод isFollowing
     */
    public function test_user_is_following(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();

        // Пользователь 1 подписывается на пользователя 2
        Follower::create([
            'follower_id' => $user1->id,
            'following_id' => $user2->id,
        ]);

        $this->assertTrue($user1->isFollowing($user2));
        $this->assertFalse($user2->isFollowing($user1));
    }

    /**
     * Тест: Подсчет подписчиков и подписок
     * Проверяет корректность подсчета followers и following
     */
    public function test_user_followers_and_following_count(): void
    {
        $user = User::factory()->create();
        $follower1 = User::factory()->create();
        $follower2 = User::factory()->create();
        $following1 = User::factory()->create();

        // 2 пользователя подписываются на нашего пользователя
        Follower::create(['follower_id' => $follower1->id, 'following_id' => $user->id]);
        Follower::create(['follower_id' => $follower2->id, 'following_id' => $user->id]);

        // Наш пользователь подписывается на 1 пользователя
        Follower::create(['follower_id' => $user->id, 'following_id' => $following1->id]);

        $this->assertEquals(2, $user->followers_count);
        $this->assertEquals(1, $user->following_count);
    }

    /**
     * Тест: Генерация URL аватара
     * Проверяет корректность формирования URL для аватара
     */
    public function test_user_avatar_url_generation(): void
    {
        $user = User::factory()->create([
            'avatar' => 'avatars/user123.jpg',
        ]);

        $avatarUrl = $user->avatar_url;
        
        $this->assertNotNull($avatarUrl);
        $this->assertStringContainsString('avatars/user123.jpg', $avatarUrl);
    }

    /**
     * Тест: Поиск пользователей
     * Проверяет работу scope Search
     */
    public function test_user_search_scope(): void
    {
        User::factory()->create(['name' => 'Александр', 'username' => 'alex_smith']);
        User::factory()->create(['name' => 'Мария', 'username' => 'maria_jones']);
        User::factory()->create(['name' => 'Петр', 'username' => 'petr_alex']);

        $results = User::search('alex')->get();

        $this->assertCount(2, $results);
    }
}


