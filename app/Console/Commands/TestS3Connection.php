<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Aws\S3\S3Client;
use Aws\Exception\AwsException;

class TestS3Connection extends Command
{
    protected $signature = 's3:test';
    protected $description = 'Тестирование подключения к S3 хранилищу с детальной диагностикой';

    public function handle()
    {
        $this->info('Тестирование подключения к S3...');
        
        $config = config('filesystems.disks.s3');
        
        $this->line("Конфигурация:");
        $this->line("- Bucket: {$config['bucket']}");
        $this->line("- Region: {$config['region']}");
        $this->line("- Endpoint: {$config['endpoint']}");
        $this->line("- Key: " . ($config['key'] ? '***установлен***' : '***отсутствует***'));
        $this->line("- Secret: " . ($config['secret'] ? '***установлен***' : '***отсутствует***'));

        try {
            // Тест 1: Создание S3 клиента
            $this->info('1. Создание S3 клиента...');
            $s3Client = new S3Client([
                'version' => 'latest',
                'region'  => $config['region'],
                'endpoint' => $config['endpoint'],
                'credentials' => [
                    'key'    => $config['key'],
                    'secret' => $config['secret'],
                ],
                'use_path_style_endpoint' => true,
                'http' => [
                    'verify' => env('AWS_SSL_VERIFY', true), // false для отключения проверки SSL
                    'timeout' => 30,
                     'connect_timeout' => 10,
                ]
            ]);
            $this->info('S3 клиент создан успешно');

            // Тест 2: Проверка существования бакета
            $this->info('2. Проверка существования бакета...');
            $result = $s3Client->headBucket([
                'Bucket' => $config['bucket'],
            ]);
            $this->info('Бакет существует и доступен');

            // Тест 3: Запись тестового файла
            $this->info('3. Тестирование загрузки файла...');
            $testKey = 'test-' . time() . '.txt';
            $s3Client->putObject([
                'Bucket' => $config['bucket'],
                'Key'    => $testKey,
                'Body'   => 'Тестовый контент ' . now(),
                'ACL'    => 'public-read',
            ]);
            $this->info('Файл загружен успешно');

            // Тест 4: Чтение тестового файла
            $this->info('4. Тестирование скачивания файла...');
            $result = $s3Client->getObject([
                'Bucket' => $config['bucket'],
                'Key'    => $testKey,
            ]);
            $this->info('Файл скачан успешно: ' . $result['Body']);

            // Тест 5: Получение URL
            $this->info('5. Генерация URL...');
            $url = $s3Client->getObjectUrl($config['bucket'], $testKey);
            $this->info("URL сгенерирован: {$url}");

            // Тест 6: Удаление тестового файла
            $this->info('6. Удаление тестового файла...');
            $s3Client->deleteObject([
                'Bucket' => $config['bucket'],
                'Key'    => $testKey,
            ]);
            $this->info('Файл удален успешно');

            $this->newLine();
            $this->info('ВСЕ ТЕСТЫ ПРОЙДЕНЫ! S3 настроен корректно.');

        } catch (AwsException $e) {
            $this->error('Ошибка AWS: ' . $e->getMessage());
            $this->error('Код ошибки: ' . $e->getAwsErrorCode());
            $this->error('Тип ошибки: ' . $e->getAwsErrorType());
            
            if ($e->getStatusCode() === 403) {
                $this->error('Доступ запрещен. Проверьте:');
                $this->error('- Access Key ID');
                $this->error('- Secret Access Key');
                $this->error('- Права доступа к бакету');
            } elseif ($e->getStatusCode() === 404) {
                $this->error('Бакет не найден. Проверьте имя бакета и регион.');
            }
            
        } catch (\Exception $e) {
            $this->error('Общая ошибка: ' . $e->getMessage());
        }
    }
}