<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Password;

/**
 * Функциональное тестирование API аутентификации (критерии 2.7.6–2.7.7).
 * Связь с пояснительной запиской: основные сценарии 1–2, исключительные 6.
 */
class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    /** Scenario 1: User registration. Успешная регистрация нового пользователя. POST /api/register */
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
        $this->assertDatabaseHas('roles', ['name' => 'user']);
        $createdUser = User::where('email', 'newuser@example.com')->firstOrFail();
        $this->assertTrue($createdUser->hasRole('user'));
    }

    /** Scenario 6: Exceptional — validation error. Регистрация с невалидными данными (422). */
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

    public function test_registration_rejects_first_name_with_digits(): void
    {
        $response = $this->postJson('/api/register', [
            'firstName' => 'Иван123',
            'lastName' => 'Петров',
            'username' => 'digits_name_user',
            'email' => 'digitsname@example.com',
            'password' => 'password123',
            'passwordConfirmation' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['firstName']);
    }

    public function test_registration_accepts_apostrophe_and_space_in_names(): void
    {
        $response = $this->postJson('/api/register', [
            'firstName' => "Jean-Pierre",
            'lastName' => "O'Brien",
            'username' => 'jean_pierre_obrien',
            'email' => 'jp.obrien@example.com',
            'password' => 'password123',
            'passwordConfirmation' => 'password123',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('users', [
            'email' => 'jp.obrien@example.com',
            'name' => "Jean-Pierre",
            'user_surname' => "O'Brien",
        ]);
    }

    public function test_registration_accepts_multipart_surname_with_spaces(): void
    {
        $response = $this->postJson('/api/register', [
            'firstName' => 'Анна',
            'lastName' => 'Van der Berg',
            'username' => 'anna_van_der_berg',
            'email' => 'anna.vdb@example.com',
            'password' => 'password123',
            'passwordConfirmation' => 'password123',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('users', [
            'email' => 'anna.vdb@example.com',
            'user_surname' => 'Van der Berg',
        ]);
    }

    public function test_registration_accepts_typographic_apostrophe_in_surname(): void
    {
        $response = $this->postJson('/api/register', [
            'firstName' => 'Мария',
            'lastName' => "D\u{2019}Angelo",
            'username' => 'maria_dangelo',
            'email' => 'maria.dangelo@example.com',
            'password' => 'password123',
            'passwordConfirmation' => 'password123',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('users', [
            'email' => 'maria.dangelo@example.com',
        ]);
        $user = User::where('email', 'maria.dangelo@example.com')->firstOrFail();
        $this->assertStringContainsString('Angelo', $user->user_surname);
    }

    public function test_registration_rejects_password_shorter_than_eight_chars(): void
    {
        $response = $this->postJson('/api/register', [
            'firstName' => 'Тест',
            'lastName' => 'Короткий',
            'username' => 'shortpass',
            'email' => 'shortpass@example.com',
            'password' => '1234567',
            'passwordConfirmation' => '1234567',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password', 'passwordConfirmation']);
    }

    /** Scenario 6: Exceptional — duplicate email. Регистрация с уже существующим email (422). */
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

    public function test_registration_normalizes_email_to_lowercase_and_trim(): void
    {
        $response = $this->postJson('/api/register', [
            'firstName' => 'Норм',
            'lastName' => 'Почта',
            'username' => 'normalized_mail_user',
            'email' => '  MiXeD.User@Example.COM  ',
            'password' => 'password123',
            'passwordConfirmation' => 'password123',
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('user.email', 'mixed.user@example.com');
        $this->assertDatabaseHas('users', [
            'email' => 'mixed.user@example.com',
        ]);
    }

    public function test_registration_rejects_email_duplicate_case_insensitive_after_normalization(): void
    {
        User::factory()->create([
            'email' => 'duplicate@example.com',
        ]);

        $response = $this->postJson('/api/register', [
            'firstName' => 'Дубль',
            'lastName' => 'Почты',
            'username' => 'duplicate_mail_user',
            'email' => 'DuPliCate@Example.com',
            'password' => 'password123',
            'passwordConfirmation' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    /** Scenario 2: User authorization. Успешный вход пользователя. POST /api/login */
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

    /** Scenario 6: Exceptional — wrong password. Вход с неверным паролем (401). */
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

    public function test_login_allows_password_shorter_than_eight_for_legacy_accounts(): void
    {
        User::factory()->create([
            'email' => 'legacy@example.com',
            'password' => bcrypt('1234567'),
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'legacy@example.com',
            'password' => '1234567',
        ]);

        $response->assertStatus(200);
    }

    /** Scenario 2: User authorization. Получение данных авторизованного пользователя. GET /api/user */
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

    /** Scenario 5: Restriction — no auth. Неавторизованный доступ к /api/user (401). */
    public function test_unauthenticated_user_cannot_access_profile(): void
    {
        $response = $this->getJson('/api/user');

        $response->assertStatus(401);
    }

    /** Scenario 2: User authorization. Выход из системы. POST /api/logout */
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

    public function test_forgot_password_returns_generic_success_message(): void
    {
        User::factory()->create([
            'email' => 'forgot@example.com',
        ]);

        $response = $this->postJson('/api/forgot-password', [
            'email' => 'forgot@example.com',
        ]);

        $response->assertStatus(200)
            ->assertJsonFragment([
                'message' => 'Если аккаунт с таким email существует, инструкция по сбросу отправлена.',
            ]);
        $this->assertDatabaseHas('password_reset_tokens', [
            'email' => 'forgot@example.com',
        ]);
    }

    public function test_forgot_password_has_generic_response_for_unknown_email(): void
    {
        $response = $this->postJson('/api/forgot-password', [
            'email' => 'unknown@example.com',
        ]);

        $response->assertStatus(200)
            ->assertJsonFragment([
                'message' => 'Если аккаунт с таким email существует, инструкция по сбросу отправлена.',
            ]);
        $this->assertDatabaseMissing('password_reset_tokens', [
            'email' => 'unknown@example.com',
        ]);
    }

    public function test_user_can_reset_password_with_valid_token(): void
    {
        $user = User::factory()->create([
            'email' => 'reset@example.com',
            'password' => bcrypt('oldpassword123'),
        ]);
        /** @var \Illuminate\Auth\Passwords\PasswordBroker $broker */
        $broker = Password::broker();
        $token = $broker->createToken($user);

        $response = $this->postJson('/api/reset-password', [
            'email' => 'reset@example.com',
            'token' => $token,
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['message' => 'Пароль успешно сброшен']);

        $loginResponse = $this->postJson('/api/login', [
            'email' => 'reset@example.com',
            'password' => 'newpassword123',
        ]);
        $loginResponse->assertStatus(200);
    }

    public function test_reset_password_fails_with_invalid_token(): void
    {
        User::factory()->create([
            'email' => 'reset2@example.com',
        ]);

        $response = $this->postJson('/api/reset-password', [
            'email' => 'reset2@example.com',
            'token' => 'invalid-token',
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ]);

        $response->assertStatus(422)
            ->assertJsonFragment(['message' => 'Не удалось сбросить пароль. Проверьте токен и email.']);
    }
}

