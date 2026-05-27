<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

/**
 * Проверка работоспособности отправки e-mail (критерий 3.10.1).
 * Запуск: php artisan mail:test [email]
 * Если email не указан — письмо уйдёт в лог при MAIL_MAILER=log.
 */
class TestMailCommand extends Command
{
    protected $signature = 'mail:test {email? : Адрес для тестового письма (опционально)}';

    protected $description = 'Отправить тестовое письмо для проверки настройки почты';

    public function handle(): int
    {
        $mailer = config('mail.default');
        $this->info("Текущий драйвер почты: {$mailer}");

        $to = $this->argument('email');
        if (!$to && $mailer === 'log') {
            $to = 'test@example.com';
            $this->warn('Адрес не указан, используется test@example.com (при MAIL_MAILER=log письмо попадёт в storage/logs/laravel.log).');
        }

        if (!$to) {
            $this->error('Укажите email: php artisan mail:test your@email.com');
            return self::FAILURE;
        }

        try {
            Mail::raw(
                "Это тестовое письмо от приложения " . config('app.name') . ".\n\nЕсли вы его получили — интеграция с каналом доставки (e-mail) работает.",
                function ($message) use ($to) {
                    $message->to($to)
                        ->subject('Тест почты — ' . config('app.name'));
                }
            );
            $this->info('Письмо отправлено успешно.');

            if ($mailer === 'log') {
                $logPath = storage_path('logs/laravel.log');
                $this->line("Письмо записано в лог: {$logPath}");
                $this->line('Проверьте конец файла — там будет содержимое письма.');
            }

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('Ошибка отправки: ' . $e->getMessage());
            return self::FAILURE;
        }
    }
}
