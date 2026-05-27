# E2E-тесты (Laravel Dusk) — критерий 2.7.8

Один автоматизированный сценарий: **вход → создание поста → редирект на пост → выход**.

---

## Важно: рабочая папка

Все команды (`php artisan …`, `php vendor/bin/phpunit …`) выполняются **только из корня проекта** — той папки, где лежат файлы `artisan`, `composer.json` и каталог `vendor`.

Если вы зашли в `vendor\laravel\dusk\bin`, там **нет** `artisan` — команды не сработают. Вернитесь:

```powershell
cd "C:\Users\kseni\Desktop\diplom"
```

---

## Полная настройка с нуля (Windows)

### 1. Корень проекта и зависимости

```powershell
cd "C:\Users\kseni\Desktop\diplom
"
composer install
```

### 2. База данных для тестов

В файле **`.env.testing`** указано имя БД (по умолчанию): `DB_DATABASE=digital-art_testing`, а также `DB_USERNAME` / `DB_PASSWORD` (часто `root` и пустой пароль).

**Создайте эту базу в MySQL один раз** (имя должно совпадать с `DB_DATABASE` в `.env.testing`):

```sql
CREATE DATABASE `digital-art_testing` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Через консоль MySQL (если `mysql` в PATH), в интерактивном режиме выполните SQL выше, либо:

```powershell
mysql -u root -p
```

После входа в клиент:

```sql
CREATE DATABASE IF NOT EXISTS `digital-art_testing` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Или создайте базу с тем же именем в phpMyAdmin / HeidiSQL / MySQL Workbench.

Если хотите другое имя — измените `DB_DATABASE` в `.env.testing` и создайте базу с этим именем.

Убедитесь, что **`APP_KEY`** в `.env.testing` задан (не пустой). Если пусто, из корня проекта:

```powershell
php artisan key:generate --env=testing
```

(или скопируйте строку `APP_KEY=` из рабочего `.env` в `.env.testing`).

### 3. ChromeDriver (один раз)

Из **корня** проекта:

```powershell
php artisan dusk:chrome-driver --detect
```

Флаг **`--detect`** ставит ChromeDriver под **установленный** Chrome/Chromium (иначе после `php artisan dusk:chrome-driver` без аргументов может скачаться «последний» драйвер, несовместимый с вашей версией браузера — ошибка `SessionNotCreatedException: ... only supports Chrome version N`).

Без `--detect` можно явно указать мажорную версию: `php artisan dusk:chrome-driver 142`.

При ошибке `cURL error 60` настройте в `php.ini` файлы `curl.cainfo` и `openssl.cafile` на [cacert.pem](https://curl.se/ca/cacert.pem), затем повторите команду.

### 4. Сборка фронтенда (Vite)

Шаблон `resources/views/app.blade.php` подключает ассеты через `@vite(...)`. Без файла **`public/build/manifest.json`** Laravel выдаёт `ViteManifestNotFoundException`, страница не отрисуется, в тесте срывается ожидание селекторов (например `.btn-outline`).

Один раз (или после изменений в `resources/js`, `resources/css`):

```powershell
npm install
npm run build
```

Альтернатива для разработки: параллельно запустить `npm run dev` и в `.env` указать `APP_URL` с тем же хостом, что у Vite — для Dusk проще стабильно использовать **`npm run build`**.

### 5. Запуск приложения (отдельное окно терминала)

Из **корня** проекта. Чтобы **браузер Dusk и тест использовали одну и ту же БД**, что в `.env.testing`, запускайте сервер с окружением **testing**:

```powershell
php artisan serve --env=testing
```

Если запустить обычный `php artisan serve` без `--env=testing`, поднимется приложение с **`.env`**: пользователь из `RefreshDatabase` в тестовой базе **не существует** на сервере — вход не пройдёт.

Оставьте процесс работающим. Адрес по умолчанию: `http://127.0.0.1:8000` или `http://localhost:8000`.

### 6. Совпадение `APP_URL` с сервером

В **`.env.testing`** должно быть то же происхождение, что и у `php artisan serve`, например:

```env
APP_URL=http://127.0.0.1:8000
```

Если сервер на `http://localhost:8000` — укажите именно его (иначе Dusk откроет «не тот» хост).

При необходимости создайте **`.env.dusk.local`** (копия фрагментов из `.env.testing`) — Laravel Dusk подхватит его; главное — `APP_URL` и доступ к MySQL.

### 7. Запуск E2E-теста

Снова из **корня** проекта (сервер из шага 5 с `--env=testing` должен быть запущен):

```powershell
php vendor/bin/phpunit -c phpunit.dusk.xml tests/Browser/LoginAndCreatePostTest.php
```

Тест использует `RefreshDatabase`: при старте выполняется `migrate:fresh` к БД из `.env.testing` — поэтому база **`digital-art_testing` должна существовать** до запуска.

При **`APP_ENV=testing`** загрузка изображения для поста идёт на диск **`public`** (не S3), чтобы E2E не зависел от облака. При необходимости один раз выполните `php artisan storage:link` — иначе превью в интерфейсе может вести на 404, но создание поста и редирект `/post/{id}` должны работать.

---

## Краткий чек-лист перед запуском

| Шаг | Действие |
|-----|----------|
| Папка | Вы в корне проекта (есть `artisan`) |
| MySQL | Создана БД `digital-art_testing` (или ваша из `.env.testing`) |
| `.env.testing` | Верные `DB_*`, непустой `APP_KEY`, `APP_URL` = URL сервера |
| ChromeDriver | Выполнен `php artisan dusk:chrome-driver --detect` из корня |
| Vite | Выполнены `npm install` и `npm run build` (есть `public/build/manifest.json`) |
| Сервер | В другом терминале: `php artisan serve --env=testing` (та же БД, что у PHPUnit) |
| Тест | `php vendor/bin/phpunit -c phpunit.dusk.xml tests/Browser/LoginAndCreatePostTest.php` |

---

## Связь со сценариями (2.7.6)

Сценарий описан в `tests/TEST_SCENARIOS.md` (раздел «E2E / UI-сценарий»).
