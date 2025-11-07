<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Post;
use App\Models\Comment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

/**
 * Функциональное тестирование API администратора
 * Проверяет доступ и функции админ-панели
 */
class AdminApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Создаем роли
        Role::create(['name' => 'admin']);
        Role::create(['name' => 'user']);
    }

    /**
     * Тест: Получение статистики администратором
     * Endpoint: GET /api/admin/stats
     */
    public function test_admin_can_get_stats(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $token = $admin->createToken('test-token')->plainTextToken;

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->getJson('/api/admin/stats');

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'total_users',
                     'active_users',
                     'deleted_users',
                     'total_posts',
                     'active_posts',
                     'deleted_posts',
                     'total_comments',
                     'active_comments',
                     'deleted_comments',
                 ]);

        // Проверяем логическую корректность (всего >= активных)
        $stats = $response->json();
        $this->assertGreaterThanOrEqual($stats['active_users'], $stats['total_users']);
        $this->assertGreaterThanOrEqual($stats['active_posts'], $stats['total_posts']);
        $this->assertGreaterThanOrEqual($stats['active_comments'], $stats['total_comments']);
        $this->assertEquals($stats['total_users'], $stats['active_users'] + $stats['deleted_users']);
    }

    /**
     * Тест: Обычный пользователь не может получить статистику
     */
    public function test_regular_user_cannot_access_admin_stats(): void
    {
        $user = User::factory()->create();
        $user->assignRole('user');
        $token = $user->createToken('test-token')->plainTextToken;

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->getJson('/api/admin/stats');

        $response->assertStatus(403);
    }

    /**
     * Тест: Администратор может получить список всех пользователей
     * Endpoint: GET /api/admin/users
     */
    public function test_admin_can_get_all_users(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $token = $admin->createToken('test-token')->plainTextToken;

        User::factory()->count(5)->create();

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->getJson('/api/admin/users');

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'data' => [
                         '*' => ['id', 'name', 'email', 'created_at'],
                     ],
                     'total',
                 ]);
    }

    /**
     * Тест: Администратор может удалить пользователя
     * Endpoint: DELETE /api/admin/users/{id}
     */
    public function test_admin_can_delete_user(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $token = $admin->createToken('test-token')->plainTextToken;

        $userToDelete = User::factory()->create();

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->deleteJson("/api/admin/users/{$userToDelete->id}");

        $response->assertStatus(200);

        $this->assertSoftDeleted('users', ['id' => $userToDelete->id]);
    }

    /**
     * Тест: Администратор не может удалить другого администратора
     */
    public function test_admin_cannot_delete_another_admin(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $token = $admin->createToken('test-token')->plainTextToken;

        $anotherAdmin = User::factory()->create();
        $anotherAdmin->assignRole('admin');

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->deleteJson("/api/admin/users/{$anotherAdmin->id}");

        $response->assertStatus(403);

        $this->assertDatabaseHas('users', [
            'id' => $anotherAdmin->id,
            'deleted_at' => null,
        ]);
    }

    /**
     * Тест: Администратор может восстановить удаленного пользователя
     * Endpoint: POST /api/admin/users/{id}/restore
     */
    public function test_admin_can_restore_deleted_user(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $token = $admin->createToken('test-token')->plainTextToken;

        $user = User::factory()->create();
        $user->delete();

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson("/api/admin/users/{$user->id}/restore");

        $response->assertStatus(200);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'deleted_at' => null,
        ]);
    }

    /**
     * Тест: Проверка корректности подсчета активных и всего пользователей
     * Тестирует исправление бага с совпадением total_users и active_users
     */
    public function test_stats_correctly_count_total_and_active_users(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $token = $admin->createToken('test-token')->plainTextToken;

        // Создаем 5 активных пользователей
        User::factory()->count(5)->create();
        
        // Создаем 3 удаленных пользователя
        $deletedUsers = User::factory()->count(3)->create();
        foreach ($deletedUsers as $user) {
            $user->delete();
        }

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->getJson('/api/admin/stats');

        $response->assertStatus(200);

        // Всего: 5 активных + 3 удаленных + 1 админ = 9
        $this->assertEquals(9, $response->json('total_users'));
        // Активных: 5 + 1 админ = 6
        $this->assertEquals(6, $response->json('active_users'));
        // Удаленных: 3
        $this->assertEquals(3, $response->json('deleted_users'));
    }

    /**
     * Тест: Фильтрация пользователей по статусу
     * Endpoint: GET /api/admin/users?status=deleted
     */
    public function test_admin_can_filter_users_by_status(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $token = $admin->createToken('test-token')->plainTextToken;

        User::factory()->count(3)->create();
        $deletedUsers = User::factory()->count(2)->create();
        foreach ($deletedUsers as $user) {
            $user->delete();
        }

        // Получаем только удаленных
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->getJson('/api/admin/users?status=deleted');

        $response->assertStatus(200);
        $this->assertCount(2, $response->json('data'));
    }

    /**
     * Тест: Поиск пользователей администратором
     * Endpoint: GET /api/admin/users?search=query
     */
    public function test_admin_can_search_users(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $token = $admin->createToken('test-token')->plainTextToken;

        User::factory()->create(['name' => 'Александр Петров']);
        User::factory()->create(['name' => 'Мария Иванова']);
        User::factory()->create(['name' => 'Петр Сидоров']);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->getJson('/api/admin/users?search=Петр');

        $response->assertStatus(200);
        $data = $response->json('data');
        
        $this->assertCount(2, $data);
    }
}

