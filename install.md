# Установка и запуск

Инструкция по развёртыванию приложения «Цифровое искусство» на локальной машине или сервере.

---

## 1. Требования

### Обязательно

| Компонент | Версия |
|-----------|--------|
| PHP | 8.2 и выше |
| Расширения PHP | `pdo`, `pdo_mysql` (или `pdo_sqlite`), `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `json`, `fileinfo`, `gd` или `imagick` |
| Composer | 2.x |
| Node.js | 18 LTS или новее |
| npm | 9+ |

### База данных (один из вариантов)

- **SQLite** — по умолчанию в `.env.example`, подходит для быстрого старта
- **MySQL 8** / MariaDB — рекомендуется для production и для запуска тестов

### Опционально

- S3-совместимое хранилище для медиафайлов (в учебном режиме можно `FILESYSTEM_DISK=local`)
- SMTP или другой mailer для email-уведомлений
- Планировщик Laravel (`schedule:run`) и воркер очереди для фоновых задач

---

## 2. Клонирование и зависимости

```bash
git clone <url-репозитория> digital-art
cd digital-art
```

### Автоматическая установка (рекомендуется)

```bash
composer run setup
```

Скрипт выполнит: `composer install`, создание `.env`, `key:generate`, миграции, `npm install`, `npm run build`.

### Ручная установка

**Windows (PowerShell):**

```powershell
composer install
copy .env.example .env
php artisan key:generate
npm install
```

**Linux / macOS:**

```bash
composer install
cp .env.example .env
php artisan key:generate
npm install
```

---

## 3. Настройка `.env`

Скопируйте `.env.example` в `.env` и отредактируйте основные параметры.

### Приложение

```env
APP_NAME="Цифровое искусство"
APP_URL=http://127.0.0.1:8000
APP_LOCALE=ru
APP_TIMEZONE=UTC
```

### База данных — SQLite (быстрый старт)

```env
DB_CONNECTION=sqlite
```

Убедитесь, что файл существует:

```bash
# Linux / macOS
touch database/database.sqlite

# Windows (PowerShell)
New-Item -ItemType File -Path database\database.sqlite -Force
```

### База данных — MySQL

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=digital_art
DB_USERNAME=root
DB_PASSWORD=
```

Создайте базу в MySQL:

```sql
CREATE DATABASE `digital_art` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Сессии, кэш и очереди

В `.env.example` по умолчанию:

```env
SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=database
```

После миграций таблицы для сессий, кэша и очередей создаются автоматически.

### Почта (опционально)

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@example.com
MAIL_FROM_NAME="${APP_NAME}"
```

Без настроенной почты внутренние уведомления в интерфейсе работают; email отправляется только для событий, где это предусмотрено.

### Медиафайлы — локально

```env
FILESYSTEM_DISK=local
```

```bash
php artisan storage:link
```

Симлинк `public/storage` → `storage/app/public` нужен для отображения загруженных файлов.

### Медиафайлы — S3-совместимое хранилище

```env
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=ru-7
AWS_BUCKET=
AWS_ENDPOINT=https://s3.ru-7.storage.selcloud.ru
AWS_USE_PATH_STYLE_ENDPOINT=true
```

### Автомодерация

```env
AUTO_MODERATION_ENABLED=true
AUTO_MODERATION_BANNED_WORDS=spam,scam
```

---

## 4. Миграции и демо-данные

```bash
php artisan migrate
php artisan db:seed
php artisan storage:link
```

Сидеры создают роли, категории, страны, тестовых пользователей и публикации.

### Учётные записи после `db:seed`

| Роль | Email | Пароль |
|------|-------|--------|
| Администратор | `admin@digital-art.ru` | `password123` |
| Пользователь | `test@example.com` | `password123` |

Панель администратора: [http://127.0.0.1:8000/admin](http://127.0.0.1:8000/admin) (нужна роль `admin`).

### Полный сброс БД

```bash
php artisan migrate:fresh --seed
```

---

## 5. Запуск

### Режим разработки (всё в одном терминале)

```bash
composer run dev
```

Поднимаются:

- `php artisan serve` (с лимитом загрузки 64 МБ)
- `php artisan queue:listen`
- `php artisan pail` (логи)
- `npm run dev` (Vite)

Откройте [http://127.0.0.1:8000](http://127.0.0.1:8000).

### Раздельный запуск

Терминал 1:

```bash
php artisan serve
```

Терминал 2:

```bash
npm run dev
```

Терминал 3 (если используется очередь `database`):

```bash
php artisan queue:work
```

### Production-сборка фронтенда

```bash
npm run build
```

Статика попадает в `public/build`. На сервере достаточно `php artisan serve` или веб-сервера (Nginx/Apache) с `public/` как document root.

---

## 6. Планировщик и фоновые задачи

В `routes/console.php` настроены ежедневные команды:

- `sanctum:prune-expired` — очистка просроченных токенов
- `comments:auto-review-stale` — автообработка устаревших комментариев
- `content:purge-trashed` — окончательное удаление просроченного контента

**Cron (Linux):**

```cron
* * * * * cd /path/to/digital-art && php artisan schedule:run >> /dev/null 2>&1
```

**Windows:** используйте Планировщик заданий с той же командой каждую минуту.

Очередь должна обрабатываться воркером:

```bash
php artisan queue:work
```

---

## 7. Лимиты загрузки файлов

Максимальный размер медиа в приложении — **50 МБ**. Убедитесь, что лимиты PHP не ниже:

```ini
upload_max_filesize = 64M
post_max_size = 64M
```

В dev-режиме `composer run dev` эти значения передаются через `-d`. На production настройте `php.ini` или конфиг веб-сервера.

---

## 8. Тестирование

### PHPUnit (Feature / Unit)

Тесты по умолчанию используют MySQL. Создайте тестовую БД:

```sql
CREATE DATABASE `digital-art_testing` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Параметры — в `.env.testing` (`DB_DATABASE=digital-art_testing`).

```bash
composer run test
# или
php artisan test
```

### Laravel Dusk (браузерные тесты)

Подробности — в [tests/Browser/README.md](tests/Browser/README.md).

Кратко:

```bash
php artisan dusk:install
php artisan dusk
```

---

## 9. Типичные проблемы

| Симптом | Решение |
|---------|---------|
| 419 / CSRF при входе | Проверьте `APP_URL`, очистите кэш: `php artisan config:clear` |
| 404 на превью изображений | Выполните `php artisan storage:link` |
| Ошибка миграций SQLite | Создайте `database/database.sqlite` |
| Тесты падают на DB | Создайте `digital-art_testing` в MySQL |
| Vite не подключается | Запустите `npm run dev` или соберите `npm run build` |
| Письма не уходят | Проверьте `MAIL_*` в `.env`, для отладки: `MAIL_MAILER=log` |
| Очередь «зависла» | Запустите `php artisan queue:work` или используйте `QUEUE_CONNECTION=sync` локально |

---

## 10. Минимальный чеклист установки

- [ ] PHP 8.2+, Composer, Node.js установлены
- [ ] `.env` создан и `APP_KEY` сгенерирован
- [ ] БД настроена (SQLite или MySQL)
- [ ] `php artisan migrate` выполнен без ошибок
- [ ] `php artisan db:seed` (по желанию)
- [ ] `php artisan storage:link`
- [ ] `npm run build` или `composer run dev`
- [ ] Сайт открывается на `APP_URL`
- [ ] Вход под `admin@digital-art.ru` и доступ к `/admin`
