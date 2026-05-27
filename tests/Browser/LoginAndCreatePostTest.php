<?php

namespace Tests\Browser;

use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Dusk\Browser;
use Tests\DuskTestCase;

/**
 * E2E-тест: основной сценарий пользователя (критерий 2.7.8, связь с 2.7.6).
 *
 * Scenario 1: User login and post creation
 * 1. Открыть страницу входа (главная, кнопка «Войти»)
 * 2. Ввести email и пароль, авторизоваться
 * 3. Перейти к созданию поста
 * 4. Заполнить форму поста и опубликовать
 * 5. Убедиться в успешном создании (редирект на страницу поста)
 * 6. Выйти из системы
 *
 * Перед запуском: npm run build; php artisan serve --env=testing (та же БД, что .env.testing).
 */
class LoginAndCreatePostTest extends DuskTestCase
{
    use RefreshDatabase;

    /** Тестовый пользователь (создаётся в setUp). */
    private static string $testEmail = 'test@example.com';

    private static string $testPassword = 'password123';

    /** id категории для обязательного select (после migrate:fresh сидов нет — список был пуст). */
    private static int $categoryId;

    protected function setUp(): void
    {
        parent::setUp();
        self::$categoryId = (int) Category::query()->create(['name' => 'E2E Dusk'])->id;
        User::factory()->create([
            'email' => self::$testEmail,
            'password' => bcrypt(self::$testPassword),
            'name' => 'E2E User',
            'user_surname' => 'Test',
            'username' => 'e2euser',
        ]);
    }

    public function test_login_create_post_success_logout(): void
    {
        $testImagePath = base_path('public/images/digital-art-1.jpg');
        $this->assertFileExists($testImagePath, 'Тестовое изображение для загрузки должно существовать');

        $categoryId = (string) self::$categoryId;

        $this->browse(function (Browser $browser) use ($testImagePath, $categoryId) {
            // 1. Страница входа загрузилась (главная с кнопкой «Войти»)
            $browser->visit('/')
                ->waitFor('.btn-outline', 15);

            // 2. Открыть модалку входа, ввести email и пароль, отправить форму
            $browser->click('.btn-outline')
                ->waitFor('input[name="email"]', 10)
                ->type('input[name="email"]', self::$testEmail)
                ->type('input[name="password"]', self::$testPassword);
            $browser->within('.modal-content', function (Browser $modal) {
                $modal->press('Войти');
            });

            // 3. После входа пункт «Добавить работу» в выпадающем меню аватара (см. Header / UserDropdown)
            $browser->waitFor('.user-avatar', 15)
                ->click('.user-avatar')
                ->waitForLink('Добавить работу', 15)
                ->assertSee('Добавить работу');

            // 4. Переход к созданию поста
            $browser->clickLink('Добавить работу')
                ->waitFor('#title', 10);

            // 5. Заполнить форму: название, описание, загрузить изображение
            $browser->type('#title', 'E2E тестовая публикация')
                ->type('#description', 'Описание создано автоматическим тестом.')
                ->type('#tags', 'e2e, dusk');
            $browser->attach('#image-upload', $testImagePath);

            // Категория обязательна (CreatePost + API); после /api/categories появится option
            $browser->waitFor('#category_id option[value="'.$categoryId.'"]', 15)
                ->select('#category_id', $categoryId);

            // 6. Опубликовать
            $browser->press('Опубликовать');

            // 7. Успех: редирект на страницу поста (/post/{id})
            $browser->waitForLocation('/post/', 15);
            $browser->assertPathBeginsWith('/post');

            // 8. Выйти: открыть меню пользователя и нажать «Выйти»
            $browser->click('.user-avatar')
                ->waitFor('button', 5);
            $browser->press('Выйти');

            // 9. После выхода снова видна кнопка «Войти»
            $browser->waitForText('Войти', 10)
                ->assertSee('Войти');
        });
    }
}
