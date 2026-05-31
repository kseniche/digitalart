<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

/**
 * Проверка загрузки медиа (посты): лимиты PHP, коды ошибок upload, MIME.
 */
final class MediaUploadHelper
{
    public const MAX_KILOBYTES = 51200; // 50 МБ

    /** @var list<string> */
    public const IMAGE_MIMES = [
        'image/jpeg',
        'image/png',
        'image/jpg',
        'image/gif',
        'image/webp',
    ];

    /** @var list<string> */
    public const VIDEO_MIMES = [
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'video/x-mp4',
        'video/x-m4v',
        'application/mp4',
    ];

    /** @var list<string> */
    public const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'm4v'];

    public static function maxBytes(): int
    {
        return self::MAX_KILOBYTES * 1024;
    }

    public static function phpUploadMaxBytes(): int
    {
        return self::parseIniSize((string) ini_get('upload_max_filesize'));
    }

    public static function phpPostMaxBytes(): int
    {
        return self::parseIniSize((string) ini_get('post_max_size'));
    }

    public static function parseIniSize(string $value): int
    {
        $value = trim($value);
        if ($value === '' || $value === '-1') {
            return PHP_INT_MAX;
        }

        $unit = strtolower(substr($value, -1));
        $number = (float) $value;

        return match ($unit) {
            'g' => (int) ($number * 1024 * 1024 * 1024),
            'm' => (int) ($number * 1024 * 1024),
            'k' => (int) ($number * 1024),
            default => (int) $number,
        };
    }

    /**
     * @throws ValidationException
     */
    public static function assertRequestFilePresent(Request $request, string $field = 'media_file'): void
    {
        $contentLength = (int) ($request->server('CONTENT_LENGTH') ?? 0);
        $postMax = self::phpPostMaxBytes();
        if ($contentLength > 0 && $postMax < PHP_INT_MAX && $contentLength > $postMax) {
            throw ValidationException::withMessages([
                $field => [
                    self::formatPostMaxExceededMessage($contentLength, $postMax),
                ],
            ]);
        }

        if ($request->hasFile($field)) {
            $file = $request->file($field);
            if ($file instanceof UploadedFile && $file->isValid()) {
                return;
            }

            if ($file instanceof UploadedFile) {
                throw ValidationException::withMessages([
                    $field => [self::messageForUploadError($file->getError(), $file->getClientOriginalName())],
                ]);
            }
        }

        $uploadMax = self::phpUploadMaxBytes();
        if ($contentLength > 0 && $uploadMax < PHP_INT_MAX && $contentLength > $uploadMax) {
            throw ValidationException::withMessages([
                $field => [
                    self::formatUploadMaxExceededMessage($contentLength, $uploadMax),
                ],
            ]);
        }

        throw ValidationException::withMessages([
            $field => ['Выберите файл для загрузки. Если файл большой, проверьте настройки PHP (upload_max_filesize, post_max_size).'],
        ]);
    }

    public static function messageForUploadError(int $errorCode, string $filename = ''): string
    {
        return match ($errorCode) {
            UPLOAD_ERR_INI_SIZE => self::formatUploadMaxExceededMessage(null, self::phpUploadMaxBytes(), $filename),
            UPLOAD_ERR_FORM_SIZE => 'Размер файла превышает допустимый лимит формы.',
            UPLOAD_ERR_PARTIAL => 'Файл загружен не полностью. Попробуйте ещё раз.',
            UPLOAD_ERR_NO_FILE => 'Файл не был получен сервером. Попробуйте выбрать файл снова.',
            UPLOAD_ERR_NO_TMP_DIR, UPLOAD_ERR_CANT_WRITE, UPLOAD_ERR_EXTENSION => 'Сервер не смог сохранить загруженный файл. Обратитесь к администратору.',
            default => 'Файл загружен некорректно. Попробуйте другой файл или уменьшите размер (до 50 МБ).',
        };
    }

    public static function formatUploadMaxExceededMessage(?int $fileBytes, int $phpLimitBytes, string $filename = ''): string
    {
        $phpMb = self::formatMegabytes($phpLimitBytes);
        $filePart = $fileBytes !== null
            ? 'Размер файла ('.self::formatMegabytes($fileBytes).') превышает лимит PHP upload_max_filesize ('.$phpMb.'). '
            : 'Лимит PHP upload_max_filesize слишком мал ('.$phpMb.'). ';

        $hint = 'Увеличьте в php.ini: upload_max_filesize=64M и post_max_size=64M, затем перезапустите сервер.'
            .($filename !== '' ? ' Файл: '.$filename.'.' : '');

        return $filePart.$hint;
    }

    public static function formatPostMaxExceededMessage(int $contentLength, int $postMaxBytes): string
    {
        return 'Общий размер запроса ('.self::formatMegabytes($contentLength).') превышает post_max_size в PHP ('.self::formatMegabytes($postMaxBytes).'). '
            .'Увеличьте post_max_size и upload_max_filesize в php.ini (рекомендуется 64M) и перезапустите сервер.';
    }

    public static function formatMegabytes(int $bytes): string
    {
        if ($bytes <= 0) {
            return '0 МБ';
        }

        return number_format($bytes / 1024 / 1024, 2, ',', ' ').' МБ';
    }

    public static function resolveMime(UploadedFile $file): string
    {
        $mime = (string) $file->getMimeType();
        if ($mime !== '' && $mime !== 'application/octet-stream') {
            return $mime;
        }

        $client = (string) $file->getClientMimeType();
        if ($client !== '' && $client !== 'application/octet-stream') {
            return $client;
        }

        $ext = strtolower((string) $file->getClientOriginalExtension());

        return match ($ext) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            'mp4' => 'video/mp4',
            'webm' => 'video/webm',
            'mov' => 'video/quicktime',
            'm4v' => 'video/x-m4v',
            default => $mime ?: $client,
        };
    }

    public static function mimeMatchesMediaType(string $mediaType, string $mime, UploadedFile $file): bool
    {
        $mime = strtolower($mime);
        $ext = strtolower((string) $file->getClientOriginalExtension());

        if ($mediaType === 'image') {
            if (in_array($mime, self::IMAGE_MIMES, true)) {
                return true;
            }

            return in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'webp'], true);
        }

        if ($mediaType === 'video') {
            if (in_array($mime, self::VIDEO_MIMES, true)) {
                return true;
            }

            return in_array($ext, self::VIDEO_EXTENSIONS, true);
        }

        return false;
    }

    /**
     * @throws ValidationException
     */
    public static function assertMimeForMediaType(string $mediaType, UploadedFile $file, string $field = 'media_file'): void
    {
        $mime = self::resolveMime($file);

        if (! self::mimeMatchesMediaType($mediaType, $mime, $file)) {
            $message = $mediaType === 'video'
                ? 'Для видео допустимы форматы MP4, WebM, MOV.'
                : 'Для изображения допустимы форматы JPEG, PNG, GIF, WebP.';

            throw ValidationException::withMessages([$field => [$message]]);
        }
    }
}
