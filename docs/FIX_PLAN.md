# План исправлений по аудиту

**Принцип:** не ломать рабочий функционал; после каждого этапа — `php artisan test` и ручной smoke (лента, создание поста, пост, админ).

---

## Этап 1 — быстрые правки (низкий риск) ✅ выполнен

| # | Задача | Файлы | Статус |
|---|--------|-------|--------|
| 1.1 | Правила публикации: 2D-цифровое искусство, AI-art, фото по тематике | `communityRulesContent.jsx`, `PublicationRulesModal.jsx` | ✅ |
| 1.2 | Email: дата, причина, адрес из `MAIL_FROM_ADDRESS` | `MailAppeal.php`, `*Notification.php` | ✅ |
| 1.3 | Валидация тегов на сервере (лимиты, 422) | `config/post_tags.php`, `PostTags.php`, `PostController.php` | ✅ |

**Проверка:** `/community-rules`, письма (log mail), создание поста с 30 тегами → 422.

---

## Этап 2 — теги и БД (средний риск) ✅ выполнен

| # | Задача | Файлы | Статус |
|---|--------|-------|--------|
| 2.1 | `posts.tags` → JSON | миграция, `2026_03_11_000007_create_posts_table.php` | ✅ |
| 2.2 | Клиент: лимит тегов, счётчик символов | `postTagLimits.js`, `CreatePost.jsx`, `EditPostModal.jsx` | ✅ |
| 2.3 | Feature-тест на 422 при переполнении | `PostApiTest.php`, `PostTagsTest.php` | ✅ |

**Проверка:** `php artisan migrate`, создание/редактирование поста, фильтр по тегам.

---

## Этап 3 — галерея медиа (низкий риск) ✅ выполнен

| # | Задача | Файлы | Статус |
|---|--------|-------|--------|
| 3.1 | Полноэкранный lightbox (Esc, клик вне) | `MediaLightbox.jsx`, `app.css` | ✅ |
| 3.2 | Подключение на странице поста | `PostDetail.jsx` | ✅ |

**Проверка:** клик по изображению/видео на `/posts/:id`, mobile.

---

## Этап 4 — админ: комментарии (средний риск) ✅ выполнен

| # | Задача | Файлы | Статус |
|---|--------|-------|--------|
| 4.1 | Сортировка `created_at` asc/desc | `AdminCommentController.php`, `AdminComments.jsx` | ✅ |
| 4.2 | Поля: возраст в очереди, `auto_review_at` | `ContentRetention.php`, `CommentCard.jsx` | ✅ |
| 4.3 | Фильтры «истекает срок», «ожидают purge» | `AdminCommentController`, `AdminComments.jsx` | ✅ |

---

## Этап 5 — удаление 7 дней (высокий риск) ✅ выполнен

| # | Задача | Файлы | Статус |
|---|--------|-------|--------|
| 5.1 | Админ: soft delete вместо `forceDelete` (комментарии) | `CommentModerationService`, `AdminCommentController` | ✅ |
| 5.2 | Cron `content:purge-trashed` (7 дней) | `ContentPurgeTrashed.php`, `routes/console.php` | ✅ |
| 5.3 | Restore API + UI (посты, комментарии) | `AdminCommentController`, `PostCard`, `AdminPosts` | ✅ |
| 5.4 | Grace period для restore постов | `AdminController`, `config/content_retention.php` | ✅ |

---

## Этап 6 — опционально ✅ выполнен

| # | Задача | Статус |
|---|--------|--------|
| 6.1 | Markdown-toolbar (`MarkdownTextarea`, CreatePost, EditPostModal) | ✅ |
| 6.2 | Справочник `countries` + autocomplete (`CountrySeeder`, Settings) | ✅ |
| 6.3 | Команда сверки `posts:sync-counts` | ✅ |

---

## Критичность

- **Критично:** этапы 1–2 (теги / 500)
- **Важно:** этапы 3, 4, 5, 7 (уведомления — этап 1)
- **Необязательно:** этап 6

---

## Журнал внедрения

| Дата | Этап | Коммит / примечание |
|------|------|---------------------|
| 2026-05-28 | 1–3 | Правила, теги, lightbox, email |
| 2026-05-28 | 4–5 | Админ-комментарии, soft delete 7 дн., purge cron |
| 2026-05-28 | 6 | Markdown-toolbar, countries, sync-counts |
