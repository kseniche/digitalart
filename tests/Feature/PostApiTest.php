<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Category;
use App\Models\User;
use App\Models\Post;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * Функциональное тестирование API публикаций (критерии 2.7.6–2.7.7).
 * Связь с пояснительной запиской: сценарий 3 — создание и публикация поста; 5–6 — ограничения и ошибки.
 */
class PostApiTest extends TestCase
{
    use RefreshDatabase;

    /** Scenario 3: Create and publish post. Получение списка публикаций. GET /api/posts */
    public function test_can_get_posts_list(): void
    {
        $user = User::factory()->create();
        Post::factory()->count(5)->create(['user_id' => $user->id]);

        $response = $this->getJson('/api/posts');

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'data' => [
                         '*' => ['id', 'post_title', 'post_content', 'author'],
                     ],
                     'current_page',
                     'last_page',
                 ]);
    }

    /** Scenario 3: Create and publish post. Создание публикации авторизованным пользователем. POST /api/posts */
    public function test_authenticated_user_can_create_post(): void
    {
        Storage::fake('s3');
        
        $user = User::factory()->create();
        $category = Category::create(['name' => 'Тестовая категория']);
        $token = $user->createToken('test-token')->plainTextToken;

        // Используем fake файл без image() чтобы не требовать GD extension
        $file = UploadedFile::fake()->create('artwork.jpg', 100, 'image/jpeg');

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson('/api/posts', [
            'title' => 'Новая работа',
            'description' => 'Описание новой работы',
            'media_file' => $file,
            'media_type' => 'image',
            'tags' => 'digital-art,3d',
            'category_id' => $category->id,
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('posts', [
            'post_title' => 'Новая работа',
            'user_id' => $user->id,
        ]);
    }

    /** Scenario 6: Exceptional — no auth. Попытка создания поста без авторизации (401). */
    public function test_unauthenticated_user_cannot_create_post(): void
    {
        $response = $this->postJson('/api/posts', [
            'post_title' => 'Новая работа',
            'post_content' => 'Описание',
        ]);

        $response->assertStatus(401);
    }

    /** Scenario 6: Exceptional — validation. Создание поста без обязательных данных (без media_file). */
    public function test_post_creation_requires_valid_data(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test-token')->plainTextToken;

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson('/api/posts', [
            'title' => 'Заголовок',
            'description' => 'Описание',
            // отсутствует media_file - обязательное поле
        ]);

        // Проверяем что публикация НЕ была успешно создана
        $this->assertNotEquals(201, $response->status(), 
            "Публикация не должна создаваться без media_file");
    }

    /** Scenario 3: Create and publish post. Получение конкретной публикации. GET /api/posts/{id} */
    public function test_can_get_single_post(): void
    {
        $post = Post::factory()->create([
            'post_title' => 'Тестовая публикация',
        ]);

        $response = $this->getJson("/api/posts/{$post->id}");

        $response->assertStatus(200)
                 ->assertJson([
                     'id' => $post->id,
                     'post_title' => 'Тестовая публикация',
                 ]);
    }

    /** Scenario 3: Create and publish post. Обновление своей публикации. PUT /api/posts/{id} */
    public function test_user_can_update_own_post(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test-token')->plainTextToken;
        
        $post = Post::factory()->create([
            'user_id' => $user->id,
            'post_title' => 'Старый заголовок',
        ]);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->putJson("/api/posts/{$post->id}", [
            'title' => 'Обновленный заголовок',
            'description' => 'Обновленное описание',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('posts', [
            'id' => $post->id,
            'post_title' => 'Обновленный заголовок',
        ]);
    }

    public function test_cannot_change_publish_settings_on_approved_post(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test-token')->plainTextToken;
        $publishedAt = now()->subDay();

        $post = Post::factory()->create([
            'user_id' => $user->id,
            'is_draft' => false,
            'moderation_status' => 'approved',
            'published_at' => $publishedAt,
        ]);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->putJson("/api/posts/{$post->id}", [
            'is_draft' => true,
        ]);

        $response->assertStatus(422);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->putJson("/api/posts/{$post->id}", [
            'published_at' => now()->addWeek()->toIso8601String(),
        ]);

        $response->assertStatus(422);
        $post->refresh();
        $this->assertFalse($post->is_draft);
        $this->assertTrue($post->published_at->equalTo($publishedAt));
    }

    public function test_update_normalizes_tags_from_csv_string_to_array(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test-token')->plainTextToken;
        $post = Post::factory()->create([
            'user_id' => $user->id,
            'tags' => ['old-tag'],
        ]);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->putJson("/api/posts/{$post->id}", [
            'tags' => ' digital-art, 3d , , illustration ',
        ]);

        $response->assertStatus(200);
        $post->refresh();
        $this->assertSame(['digital-art', '3d', 'illustration'], $post->tags);
    }

    public function test_authenticated_user_can_create_video_post(): void
    {
        Storage::fake('s3');

        $user = User::factory()->create();
        $category = Category::create(['name' => 'Видео категория']);
        $token = $user->createToken('test-token')->plainTextToken;
        $file = UploadedFile::fake()->create('artwork.mp4', 2048, 'video/mp4');

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson('/api/posts', [
            'title' => 'Видео работа',
            'description' => 'Описание видео работы',
            'category_id' => $category->id,
            'media_file' => $file,
            'media_type' => 'video',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('posts', [
            'post_title' => 'Видео работа',
            'user_id' => $user->id,
            'media_type' => 'video',
        ]);
    }

    public function test_post_creation_rejects_video_when_media_type_image(): void
    {
        Storage::fake('s3');

        $user = User::factory()->create();
        $category = Category::create(['name' => 'Категория для валидации']);
        $token = $user->createToken('test-token')->plainTextToken;
        $file = UploadedFile::fake()->create('video.mp4', 512, 'video/mp4');

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson('/api/posts', [
            'title' => 'Неверный тип',
            'description' => 'Проверка валидации',
            'category_id' => $category->id,
            'media_file' => $file,
            'media_type' => 'image',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['media_file']);
    }

    public function test_post_is_auto_rejected_when_contains_banned_word(): void
    {
        Storage::fake('s3');
        config()->set('auto_moderation.default_banned_words', ['forbiddenword']);
        config()->set('auto_moderation.banned_words', []);

        $user = User::factory()->create();
        $category = Category::create(['name' => 'Тестовая категория']);
        $token = $user->createToken('test-token')->plainTextToken;
        $file = UploadedFile::fake()->create('artwork.jpg', 100, 'image/jpeg');

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson('/api/posts', [
            'title' => 'Новая работа',
            'description' => 'Текст содержит forbiddenword и должен быть отклонен',
            'media_file' => $file,
            'media_type' => 'image',
            'tags' => 'digital-art',
            'category_id' => $category->id,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('post.moderation_status', 'rejected');

        $this->assertDatabaseHas('posts', [
            'user_id' => $user->id,
            'moderation_status' => 'rejected',
            'auto_moderation_passed' => 0,
        ]);
    }

    /** Scenario 5: Restriction — insufficient rights. Пользователь не может обновить чужую публикацию (403). */
    public function test_user_cannot_update_others_post(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $token = $otherUser->createToken('test-token')->plainTextToken;
        
        $post = Post::factory()->create(['user_id' => $owner->id]);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->putJson("/api/posts/{$post->id}", [
            'post_title' => 'Попытка изменить',
        ]);

        $response->assertStatus(403);
    }

    /** Scenario 3: Create and publish post. Удаление своей публикации. DELETE /api/posts/{id} */
    public function test_user_can_delete_own_post(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test-token')->plainTextToken;
        
        $post = Post::factory()->create(['user_id' => $user->id]);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->deleteJson("/api/posts/{$post->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('posts', ['id' => $post->id]);
    }

    /** Scenario 3: Create and publish post. Поиск публикаций. GET /api/posts?q= */
    public function test_can_search_posts(): void
    {
        Post::factory()->create(['post_title' => 'Цифровая живопись']);
        Post::factory()->create(['post_title' => 'Концепт-арт']);
        Post::factory()->create(['post_title' => '3D моделирование']);

        $response = $this->getJson('/api/posts?q=цифровая');

        $response->assertStatus(200);
        
        $data = $response->json('data');
        $this->assertGreaterThanOrEqual(1, count($data));
        
        // Проверяем что хотя бы одна публикация содержит искомое слово
        $found = collect($data)->contains('post_title', 'Цифровая живопись');
        $this->assertTrue($found);
    }

    /** Scenario 3: Create and publish post. Фильтрация публикаций по тегам. GET /api/posts?tag= */
    public function test_can_filter_posts_by_tag(): void
    {
        Post::factory()->create(['tags' => ['digital-art', '3d']]);
        Post::factory()->create(['tags' => ['concept-art']]);
        Post::factory()->create(['tags' => ['digital-art', 'illustration']]);

        $response = $this->getJson('/api/posts?tag=digital-art');

        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertGreaterThanOrEqual(2, count($data));
        foreach ($data as $row) {
            $tags = is_array($row['tags']) ? $row['tags'] : [];
            $this->assertContains('digital-art', $tags);
        }
    }

    /** Фильтр по категории: ?category= и ?category_id= */
    public function test_can_filter_posts_by_category(): void
    {
        $categoryA = Category::create(['name' => 'Живопись']);
        $categoryB = Category::create(['name' => 'Скульптура']);

        Post::factory()->create(['category_id' => $categoryA->id, 'tags' => ['a']]);
        Post::factory()->create(['category_id' => $categoryA->id, 'tags' => ['b']]);
        Post::factory()->create(['category_id' => $categoryB->id, 'tags' => ['c']]);

        $response = $this->getJson('/api/feed?category=' . $categoryA->id);

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(2, $data);
        foreach ($data as $row) {
            $this->assertSame($categoryA->id, (int) $row['category_id']);
        }

        $responseAlias = $this->getJson('/api/feed?category_id=' . $categoryB->id);
        $responseAlias->assertStatus(200);
        $this->assertCount(1, $responseAlias->json('data'));
    }

    /** Частичный поиск: «art» находит теги digital-art, concept-art и т.п. */
    public function test_tag_filter_matches_substrings_in_tag_names(): void
    {
        Post::factory()->create(['tags' => ['digital-art']]);
        Post::factory()->create(['tags' => ['concept-art']]);
        Post::factory()->create(['tags' => ['скульптура']]);

        $response = $this->getJson('/api/feed?tag=art');

        $response->assertStatus(200);
        $this->assertCount(2, $response->json('data'));
    }

    /** Частичный поиск: «3D» находит и «3D», и «3D-model». */
    public function test_tag_filter_matches_tag_prefix_substring(): void
    {
        Post::factory()->create(['tags' => ['3D-model']]);
        Post::factory()->create(['tags' => ['3D']]);

        $only3d = $this->getJson('/api/feed?tag=3D');
        $only3d->assertStatus(200);
        $this->assertCount(2, $only3d->json('data'));
    }

    /** «art» не должен находить теги без подстроки art (illustration, photography, скульптура). */
    public function test_tag_filter_excludes_tags_without_substring(): void
    {
        Post::factory()->create(['tags' => ['digital-art']]);
        Post::factory()->create(['tags' => ['illustration']]);
        Post::factory()->create(['tags' => ['photography']]);
        Post::factory()->create(['tags' => ['скульптура']]);
        Post::factory()->create(['tags' => ['3d-render']]);

        $response = $this->getJson('/api/feed?tag=art');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
    }

    /** Плоская строка тега (ручной SQL) и кириллица. */
    public function test_tag_filter_plain_string_and_cyrillic(): void
    {
        $plain = Post::factory()->create(['tags' => ['other']]);
        \Illuminate\Support\Facades\DB::table('posts')->where('id', $plain->id)->update(['tags' => 'Сидоров']);
        Post::factory()->create(['tags' => ['Иванов']]);

        $response = $this->getJson('/api/feed?tag=' . rawurlencode('Сидоров'));
        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
    }
}

