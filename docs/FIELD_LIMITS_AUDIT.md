# Аудит лимитов пользовательского ввода

Единый источник лимитов:
- сервер: `config/field_limits.php`, `config/post_tags.php`
- клиент: `resources/js/constants/fieldLimits.js`, `resources/js/utils/postTagLimits.js`

UI: компонент `CharCounter`, предупреждение при ≥90% лимита (классы `char-counter--warn`, `char-counter--over`).

Ошибки API: `resources/js/utils/apiValidation.js` — ответ **422** разбирается в поля формы; сообщения из `lang/ru/validation.php`.

---

## Публикации

| Поле | Min | Max (сервер) | Max (клиент) | Форма |
|------|-----|--------------|--------------|-------|
| Название | 1 | 255 | 255 | CreatePost, EditPostModal |
| Описание | 1 | 50 000 | 50 000 | CreatePost, EditPostModal (MarkdownTextarea) |
| Теги (строка) | 0 | 500 | 500 | CreatePost, EditPostModal |
| Тегов (шт.) | — | 20 | 20 | PostTags + postTagLimits |
| Символов в теге | — | 50 | 50 | PostTags + postTagLimits |
| Медиа | — | 50 МБ | 50 МБ | CreatePost |

**Причина «Ошибка сервера» при создании поста:** раньше колонка `tags` была `VARCHAR(255)`; при длинной строке тегов БД падала с **500**. После миграции на JSON и валидации `PostTags` / `max:500` сервер отвечает **422** с текстом на русском. На клиенте лимит названия был **100** при серверных **255** — исправлено на **255**.

Валидация тегов выполняется в `PostController::tagsValidationRules()` **до** сохранения файла.

---

## Комментарии

| Поле | Min | Max | Форма |
|------|-----|-----|-------|
| Текст | 1 | 2000 | PostDetail |

Сервер: `CommentController` — `content` `max:2000`.

---

## Профиль (настройки)

| Поле | Min | Max | Форма |
|------|-----|-----|-------|
| Имя | 1 | 255 | Settings (+ PersonNameLetters) |
| Фамилия | 0 | 255 | Settings |
| Никнейм | 3 | 255 | Settings |
| Email | — | 255 | Settings |
| Телефон | — | 16 | Settings (+ InternationalPhone) |
| Веб-сайт | — | 255 | Settings (+ WebsiteUrl) |
| О себе | 0 | 2000 | Settings (добавлен `max` на сервере) |

---

## Регистрация / авторизация

| Поле | Min | Max | Форма |
|------|-----|-----|-------|
| Имя, фамилия | 1 | 255 | RegisterModal |
| Логин | 3 | 255 | RegisterModal |
| Email | — | 255 | RegisterModal, LoginModal |
| Пароль | 8 | 255 | RegisterModal, смена пароля в Settings |

---

## Жалобы и админка

| Поле | Max | Форма |
|------|-----|-------|
| Пояснение к жалобе на комментарий | 1000 | CommentReportModal |
| Причина бана | 3–1000 | Admin (UserDetail) |
| Категория (админ) | 255 | AdminCategories |

---

## Связанные файлы

- `app/Http/Controllers/Api/PostController.php` — description max, теги в rules
- `app/Support/PostTags.php`
- `resources/js/components/common/CharCounter.jsx`
- `resources/js/utils/fieldValidation.js`
