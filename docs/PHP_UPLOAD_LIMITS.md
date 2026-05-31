# Лимиты загрузки файлов (PHP)

Публикации: до **50 МБ** (изображения и видео MP4/WebM/MOV).

## Частая причина ошибки «загружен некорректно»

Файл меньше 50 МБ, но PHP отклоняет загрузку из‑за **`upload_max_filesize`** (часто **2M** по умолчанию).

Пример: видео 5.44 МБ при `upload_max_filesize=2M` → ошибка до проверки Laravel.

## Что сделать локально (Windows)

1. Узнайте `php.ini`:
   ```bash
   php --ini
   ```
2. Установите:
   ```ini
   upload_max_filesize = 64M
   post_max_size = 64M
   ```
3. Перезапустите веб‑сервер / `php artisan serve`.

Либо запускайте проект через:
```bash
composer run dev
```
(в скрипте `dev` сервер уже стартует с `-d upload_max_filesize=64M -d post_max_size=64M`).

## Хостинг

Файл `public/.user.ini` задаёт те же лимиты для PHP-FPM/CGI (если хостинг это разрешает).

## Проверка

```bash
php -r "echo ini_get('upload_max_filesize'), PHP_EOL;"
```

Должно быть не меньше **64M** (или хотя бы больше размера вашего файла).
