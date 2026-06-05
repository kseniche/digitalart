<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Category;
use App\Models\User;
use App\Models\Post;
use App\Models\Comment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Facades\DB;

/**
 * Функциональное тестирование API администратора (критерии 2.7.6–2.7.7).
 * Связь с пояснительной запиской: сценарий 4 — действия администратора; 5 — ограничение прав.
 */
class AdminApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::create(['name' => 'admin']);
        Role::create(['name' => 'user']);
    }

    /** Scenario 4: Admin actions. Получение статистики администратором. GET /api/admin/stats */
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

    /** Scenario 5: Restriction — insufficient rights. Обычный пользователь не может получить статистику (403). */
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

    /** Scenario 4: Admin actions. Администратор может получить список всех пользователей. GET /api/admin/users */
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

    /** Scenario 4: Admin actions (moderation). Администратор может удалить пользователя. DELETE /api/admin/users/{id} */
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

    /** Scenario 6: Exceptional — forbidden. Администратор не может удалить другого администратора (403). */
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

    /** Scenario 4: Admin actions. Администратор не может одобрить комментарий, пока пост непубличен. */
    public function test_admin_cannot_approve_comment_for_non_public_post(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $token = $admin->createToken('test-token')->plainTextToken;

        $author = User::factory()->create();
        $post = Post::factory()->create([
            'user_id' => $author->id,
            'is_draft' => true,
            'moderation_status' => 'approved',
            'published_at' => now()->subHour(),
            'comment_count' => 0,
        ]);

        $commentUser = User::factory()->create();
        $comment = \App\Models\Comment::factory()->create([
            'user_id' => $commentUser->id,
            'post_id' => $post->id,
            'moderation_status' => 'pending',
        ]);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson("/api/admin/comments/{$comment->id}/approve");

        $response->assertStatus(422);

        $comment->refresh();
        $post->refresh();

        $this->assertSame('pending', $comment->moderation_status);
        $this->assertSame(0, $post->comment_count);
    }

    /** Scenario 4: Admin actions. Администратор может одобрить комментарий для публичного поста. */
    public function test_admin_can_approve_comment_for_public_post(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $token = $admin->createToken('test-token')->plainTextToken;

        $author = User::factory()->create();
        $post = Post::factory()->create([
            'user_id' => $author->id,
            'is_draft' => false,
            'moderation_status' => 'approved',
            'published_at' => now()->subHour(),
            'comment_count' => 0,
        ]);

        $commentUser = User::factory()->create();
        $comment = \App\Models\Comment::factory()->create([
            'user_id' => $commentUser->id,
            'post_id' => $post->id,
            'moderation_status' => 'pending',
        ]);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson("/api/admin/comments/{$comment->id}/approve");

        $response->assertStatus(200);

        $comment->refresh();
        $post->refresh();

        $this->assertSame('approved', $comment->moderation_status);
        $this->assertSame(1, $post->comment_count);
    }

    /** Scenario 4: Admin actions. Администратор может восстановить удалённого пользователя. POST /api/admin/users/{id}/restore */
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

    /** Scenario 4: Admin actions. Корректность подсчёта активных и всего пользователей в статистике. */
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

    /** Scenario 4: Admin actions. Фильтрация пользователей по статусу. GET /api/admin/users?status=deleted */
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

    /** Scenario 4: Admin actions. Ограничение per_page в админке. */
    public function test_admin_pagination_clamps_per_page(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $token = $admin->createToken('test-token')->plainTextToken;

        // USERS
        User::factory()->count(200)->create();
        $usersResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->getJson('/api/admin/users?per_page=10000');

        $usersResponse->assertStatus(200);
        $this->assertEquals(100, $usersResponse->json('per_page'));
        $this->assertLessThanOrEqual(100, count($usersResponse->json('data')));

        // POSTS
        $author = User::factory()->create();
        Post::factory()->count(200)->create(['user_id' => $author->id]);

        $postsResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->getJson('/api/admin/posts?per_page=10000');

        $postsResponse->assertStatus(200);
        $this->assertEquals(100, $postsResponse->json('per_page'));
        $this->assertLessThanOrEqual(100, count($postsResponse->json('data')));

        // COMMENTS
        $post = Post::factory()->create(['user_id' => $author->id]);
        Comment::factory()->count(200)->create(['user_id' => $author->id, 'post_id' => $post->id]);

        $commentsResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->getJson('/api/admin/comments?per_page=10000');

        $commentsResponse->assertStatus(200);
        $this->assertEquals(100, $commentsResponse->json('per_page'));
        $this->assertLessThanOrEqual(100, count($commentsResponse->json('data')));
    }

    /** Scenario 4: Admin actions. Поиск пользователей администратором. GET /api/admin/users?search= */
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

    public function test_admin_can_reject_post_without_deleting_it(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $token = $admin->createToken('test-token')->plainTextToken;
        $author = User::factory()->create();
        $post = Post::factory()->create([
            'user_id' => $author->id,
            'moderation_status' => 'pending',
            'deleted_at' => null,
        ]);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson("/api/admin/posts/{$post->id}/reject", [
            'reason' => 'Нужно исправить содержание и теги',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('posts', [
            'id' => $post->id,
            'moderation_status' => 'rejected',
            'deleted_at' => null,
            'moderation_rejection_reason' => 'Нужно исправить содержание и теги',
        ]);
    }

    public function test_admin_can_delete_post_for_rules_violation_and_make_it_uneditable_for_user(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $adminToken = $admin->createToken('test-token')->plainTextToken;
        $author = User::factory()->create();
        $authorToken = $author->createToken('author-token')->plainTextToken;
        $post = Post::factory()->create([
            'user_id' => $author->id,
            'moderation_status' => 'approved',
        ]);

        $deleteResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $adminToken,
        ])->deleteJson("/api/admin/posts/{$post->id}", [
            'reason' => 'Запрещенный контент',
        ]);

        $deleteResponse->assertStatus(200)
            ->assertJsonFragment(['message' => 'Пост удален из за нарушения правил сообщества']);

        $this->assertSoftDeleted('posts', ['id' => $post->id]);

        $updateResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $authorToken,
        ])->putJson("/api/posts/{$post->id}", [
            'title' => 'Попытка исправления',
        ]);

        $updateResponse->assertStatus(404);
    }

    public function test_admin_delete_comment_is_permanent(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $token = $admin->createToken('test-token')->plainTextToken;

        $author = User::factory()->create();
        $post = Post::factory()->create([
            'user_id' => $author->id,
            'comment_count' => 1,
        ]);
        $comment = Comment::factory()->create([
            'user_id' => $author->id,
            'post_id' => $post->id,
            'moderation_status' => 'approved',
            'approved_at' => now(),
        ]);

        $deleteResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->deleteJson("/api/admin/comments/{$comment->id}");

        $deleteResponse->assertStatus(200);
        $this->assertDatabaseMissing('comments', ['id' => $comment->id]);

        $post->refresh();
        $this->assertSame(0, (int) $post->comment_count);
    }

    public function test_admin_report_uses_actual_model_fields(): void
    {
        $admin = User::factory()->create([
            'name' => 'Админ',
            'user_surname' => 'Тестовый',
            'email' => 'admin_report@example.com',
            'username' => 'admin_report',
        ]);
        $admin->assignRole('admin');
        $token = $admin->createToken('test-token')->plainTextToken;

        $author = User::factory()->create([
            'name' => 'Иван',
            'user_surname' => 'Петров',
            'email' => 'author_report@example.com',
            'username' => 'author_report',
        ]);

        $post = Post::factory()->create([
            'user_id' => $author->id,
            'post_title' => 'Проверка отчета пост',
            'tags' => ['tag-a', 'tag-b'],
        ]);

        Comment::factory()->create([
            'user_id' => $author->id,
            'post_id' => $post->id,
            'comment_content' => 'Проверка отчета комментарий',
        ]);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->get('/api/admin/report');

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');

        $csv = $response->getContent();
        $this->assertStringStartsWith("\xEF\xBB\xBF", $csv);
        $this->assertStringContainsString('Версия формата', $csv);
        $this->assertStringContainsString('Иван', $csv);
        $this->assertStringContainsString('Петров', $csv);
        $this->assertStringContainsString('Проверка отчета пост', $csv);
        $this->assertStringContainsString('Проверка отчета комментарий', $csv);
        $this->assertStringContainsString('tag-a, tag-b', $csv);
        $this->assertStringContainsString('Статус модерации', $csv);
        $this->assertStringContainsString('Заблокирован', $csv);
    }

    public function test_admin_ban_user_requires_ban_reason(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $target = User::factory()->create();
        $target->assignRole('user');
        $token = $admin->createToken('test-token')->plainTextToken;

        $this->withHeaders(['Authorization' => 'Bearer ' . $token])
            ->postJson("/api/admin/users/{$target->id}/ban", [])
            ->assertStatus(422);

        $this->withHeaders(['Authorization' => 'Bearer ' . $token])
            ->postJson("/api/admin/users/{$target->id}/ban", [
                'ban_reason' => 'Нарушение правил сообщества',
            ])
            ->assertStatus(200);

        $target->refresh();
        $this->assertTrue($target->is_banned);
        $this->assertSame('Нарушение правил сообщества', $target->ban_reason);
    }

    public function test_admin_delete_tag_removes_tag_from_posts_only(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $token = $admin->createToken('test-token')->plainTextToken;

        $post = Post::factory()->create([
            'tags' => ['alpha', 'beta'],
            'moderation_status' => 'approved',
        ]);

        $this->withHeaders(['Authorization' => 'Bearer ' . $token])
            ->deleteJson('/api/admin/tags', ['tag' => 'alpha'])
            ->assertStatus(200);

        $post->refresh();
        $this->assertSame(['beta'], $post->tags);
        $this->assertDatabaseHas('posts', ['id' => $post->id]);
    }

    public function test_admin_can_filter_posts_by_tag_and_category(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $token = $admin->createToken('test-token')->plainTextToken;

        $categoryA = Category::query()->create(['name' => 'Digital Art']);
        $categoryB = Category::query()->create(['name' => 'Sculpture']);

        $author = User::factory()->create();
        Post::factory()->create([
            'user_id' => $author->id,
            'category_id' => $categoryA->id,
            'tags' => ['digital-art', '3d'],
            'moderation_status' => 'approved',
        ]);
        Post::factory()->create([
            'user_id' => $author->id,
            'category_id' => $categoryB->id,
            'tags' => ['concept-art'],
            'moderation_status' => 'approved',
        ]);

        $byTag = $this->withHeaders(['Authorization' => 'Bearer ' . $token])
            ->getJson('/api/admin/posts?tag=digital&status=approved');

        $byTag->assertStatus(200);
        $this->assertCount(1, $byTag->json('data'));
        $this->assertStringContainsString('digital', strtolower($byTag->json('data.0.tags.0') ?? ''));

        $byCategory = $this->withHeaders(['Authorization' => 'Bearer ' . $token])
            ->getJson('/api/admin/posts?category_id=' . $categoryB->id . '&status=approved');

        $byCategory->assertStatus(200);
        $this->assertCount(1, $byCategory->json('data'));
        $this->assertEquals($categoryB->id, $byCategory->json('data.0.category_id'));
    }

    public function test_admin_can_get_analytics(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $token = $admin->createToken('test-token')->plainTextToken;

        $author = User::factory()->create();
        Post::factory()->count(2)->create([
            'user_id' => $author->id,
            'moderation_status' => 'approved',
            'is_draft' => false,
        ]);

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $token])
            ->getJson('/api/admin/analytics?period=month');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'period',
                'charts' => [
                    'users' => [['date', 'label', 'count']],
                    'posts' => [['date', 'label', 'count']],
                ],
                'summary' => [
                    'new_users',
                    'published_posts',
                    'pending_moderation',
                    'rejected_posts',
                    'new_comments',
                    'deleted_comments',
                    'avg_likes_per_post',
                ],
                'top_categories',
                'top_tags',
                'top_authors',
            ]);

        $this->assertGreaterThanOrEqual(2, $response->json('summary.published_posts'));
    }

    public function test_regular_user_cannot_access_admin_analytics(): void
    {
        $user = User::factory()->create();
        $user->assignRole('user');
        $token = $user->createToken('test-token')->plainTextToken;

        $this->withHeaders(['Authorization' => 'Bearer ' . $token])
            ->getJson('/api/admin/analytics?period=week')
            ->assertStatus(403);
    }
}

