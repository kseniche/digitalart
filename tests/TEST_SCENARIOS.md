# Сценарии тестирования (критерии 2.7.6–2.7.7)

Документ связывает пояснительную записку диплома с тестами: основные пользовательские сценарии, ролевые и исключительные случаи.

---

## Основные сценарии

### Сценарий 1: Регистрация пользователя
- **Описание:** новый пользователь заполняет форму регистрации и получает учётную запись.
- **Тесты:** `Tests\Feature\AuthApiTest::test_user_can_register`, `test_registration_requires_valid_data`, `test_registration_with_duplicate_email`.

### Сценарий 2: Авторизация пользователя
- **Описание:** вход по email/пароль, получение профиля, выход.
- **Тесты:** `AuthApiTest::test_user_can_login`, `test_authenticated_user_can_get_profile`, `test_user_can_logout`, `test_unauthenticated_user_cannot_access_profile`, `test_login_with_invalid_credentials`.

### Сценарий 3: Создание и публикация поста
- **Описание:** авторизованный пользователь создаёт, редактирует, удаляет публикацию; просмотр ленты, поиск, фильтр по тегам.
- **Тесты:** `Tests\Feature\PostApiTest::test_authenticated_user_can_create_post`, `test_can_get_posts_list`, `test_can_get_single_post`, `test_user_can_update_own_post`, `test_user_can_delete_own_post`, `test_can_search_posts`, `test_can_filter_posts_by_tag`.

---

## Ролевые сценарии

### Сценарий 4: Действия администратора (модерация / удаление)
- **Описание:** доступ к админ-панели, статистика, управление пользователями/публикациями/комментариями, восстановление удалённых.
- **Тесты:** `Tests\Feature\AdminApiTest::test_admin_can_get_stats`, `test_admin_can_get_all_users`, `test_admin_can_delete_user`, `test_admin_can_restore_deleted_user`, `test_stats_correctly_count_total_and_active_users`, `test_admin_can_filter_users_by_status`, `test_admin_can_search_users`.

### Сценарий 5: Ограничение прав обычного пользователя
- **Описание:** обычный пользователь не может вызывать админские API; не может изменять/удалять чужие ресурсы.
- **Тесты:** `AdminApiTest::test_regular_user_cannot_access_admin_stats`; `PostApiTest::test_unauthenticated_user_cannot_create_post`, `test_user_cannot_update_others_post`; `AuthApiTest::test_unauthenticated_user_cannot_access_profile`.

---

## Исключительный сценарий (ошибка / запрет / сбой)

### Сценарий 6: Ошибки валидации, неверный пароль, отсутствие прав, запрещённые действия
- **Описание:** 401/403/422, неверный пароль, попытка действия без авторизации или без прав.
- **Тесты:** `AuthApiTest::test_registration_requires_valid_data`, `test_registration_with_duplicate_email`, `test_login_with_invalid_credentials`; `PostApiTest::test_unauthenticated_user_cannot_create_post`, `test_post_creation_requires_valid_data`, `test_user_cannot_update_others_post`; `AdminApiTest::test_admin_cannot_delete_another_admin`.

---

## E2E / UI-сценарий (критерий 2.7.8)

**Реализован один автоматизированный e2e-тест (Laravel Dusk):**

**Вход → создание поста → успешное сообщение (редирект) → выход**

1. Открыть главную страницу.
2. Нажать «Войти», ввести email и пароль, авторизоваться.
3. Перейти к созданию публикации («Добавить работу»), заполнить форму (название, описание, изображение), нажать «Опубликовать».
4. Убедиться в редиректе на страницу поста (`/post/{id}`).
5. Открыть меню пользователя и нажать «Выйти».
6. Убедиться, что снова отображается кнопка «Войти».

Файл теста: `tests/Browser/LoginAndCreatePostTest.php`. Инструкция по запуску: `tests/Browser/README.md`.

---

## Формулировка для пояснительной записки

*«В системе реализована комплексная обработка ошибок и сбоев с сохранением пользовательских данных и унифицированными уведомлениями. Проведено тестирование по основным пользовательским сценариям и ролям, включая исключительные случаи.»*
