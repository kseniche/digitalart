<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

/**
 * Функциональное тестирование API аутентификации
 * Проверяет работу endpoints регистрации, входа и выхода
 */
class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Тест: Успешная регистрация нового пользователя
     * Endpoint: POST /api/register
     */
    public function test_user_can_register(): void
    {
        $userData = [
            'firstName' => 'Новый',
            'lastName' => 'Пользователь',
            'username' => 'new_user',
            'email' => 'newuser@example.com',
            'password' => 'password123',
            'passwordConfirmation' => 'password123',
        ];

        $response = $this->postJson('/api/register', $userData);

        $response->assertStatus(201)
                 ->assertJsonStructure([
                     'user' => ['id', 'name', 'email', 'username'],
                     'token',
                 ]);

        $this->assertDatabaseHas('users', [
            'email' => 'newuser@example.com',
            'username' => 'new_user',
        ]);
    }

    /**
     * Тест: Регистрация с невалидными данными
     * Проверяет валидацию при регистрации
     */
    public function test_registration_requires_valid_data(): void
    {
        $response = $this->postJson('/api/register', [
            'firstName' => '',
            'lastName' => '',
            'email' => 'invalid-email',
            'password' => '123', // слишком короткий
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['firstName', 'lastName', 'email', 'password']);
    }

    /**
     * Тест: Регистрация с уже существующим email
     * Проверяет уникальность email
     */
    public function test_registration_with_duplicate_email(): void
    {
        $existingUser = User::factory()->create([
            'email' => 'existing@example.com'
        ]);

        $response = $this->postJson('/api/register', [
            'firstName' => 'Тест',
            'lastName' => 'Тестов',
            'username' => 'testuser',
            'email' => 'existing@example.com',
            'password' => 'password123',
            'passwordConfirmation' => 'password123',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['email']);
    }

    /**
     * Тест: Успешный вход пользователя
     * Endpoint: POST /api/login
     */
    public function test_user_can_login(): void
    {
        $user = User::factory()->create([
            'email' => 'testuser@example.com',
            'password' => bcrypt('password123'),
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'testuser@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'user' => ['id', 'name', 'email'],
                     'token',
                 ]);
    }

    /**
     * Тест: Вход с неверными учетными данными
     * Проверяет обработку неправильного пароля
     */
    public function test_login_with_invalid_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'testuser@example.com',
            'password' => bcrypt('correctpassword'),
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'testuser@example.com',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(401);
    }

    /**
     * Тест: Получение данных авторизованного пользователя
     * Endpoint: GET /api/user
     */
    public function test_authenticated_user_can_get_profile(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test-token')->plainTextToken;

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->getJson('/api/user');

        $response->assertStatus(200)
                 ->assertJsonFragment([
                     'id' => $user->id,
                     'email' => $user->email,
                 ]);
    }

    /**
     * Тест: Неавторизованный доступ к профилю
     * Проверяет защиту endpoint без токена
     */
    public function test_unauthenticated_user_cannot_access_profile(): void
    {
        $response = $this->getJson('/api/user');

        $response->assertStatus(401);
    }

    /**
     * Тест: Выход из системы
     * Endpoint: POST /api/logout
     */
    public function test_user_can_logout(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test-token')->plainTextToken;

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson('/api/logout');

        $response->assertStatus(200);

        // Проверяем, что токен удален
        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $user->id,
        ]);
    }
}

