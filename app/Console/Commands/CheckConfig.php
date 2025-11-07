<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class CheckConfig extends Command
{
    protected $signature = 'config:check';
    protected $description = 'Проверка конфигурации S3 хранилища';

    public function handle()
    {
        $this->info('Проверка конфигурации S3...');
        
        // Проверяем переменные окружения
        $this->info('Переменные окружения:');
        $this->line('AWS_ACCESS_KEY_ID: ' . (env('AWS_ACCESS_KEY_ID') ? 'установлен' : 'НЕ УСТАНОВЛЕН'));
        $this->line('AWS_SECRET_ACCESS_KEY: ' . (env('AWS_SECRET_ACCESS_KEY') ? 'установлен' : 'НЕ УСТАНОВЛЕН'));
        $this->line('AWS_DEFAULT_REGION: ' . (env('AWS_DEFAULT_REGION') ?: 'НЕ УСТАНОВЛЕН'));
        $this->line('AWS_BUCKET: ' . (env('AWS_BUCKET') ?: 'НЕ УСТАНОВЛЕН'));
        $this->line('AWS_ENDPOINT: ' . (env('AWS_ENDPOINT') ?: 'НЕ УСТАНОВЛЕН'));
        
        // Проверяем конфигурацию
        $this->info('Конфигурация S3:');
        $config = config('filesystems.disks.s3');
        $this->line('driver: ' . ($config['driver'] ?? 'не задан'));
        $this->line('key: ' . ($config['key'] ? 'установлен' : 'не установлен'));
        $this->line('secret: ' . ($config['secret'] ? 'установлен' : 'не установлен'));
        $this->line('region: ' . ($config['region'] ?? 'не задан'));
        $this->line('bucket: ' . ($config['bucket'] ?? 'не задан'));
        $this->line('endpoint: ' . ($config['endpoint'] ?? 'не задан'));
        $this->line('use_path_style_endpoint: ' . ($config['use_path_style_endpoint'] ? 'true' : 'false'));
        
        // Тестируем загрузку
        $this->info('Тестирование загрузки...');
        try {
            $testContent = 'Test content at ' . now();
            $testPath = 'test-' . time() . '.txt';
            
            Storage::disk('s3')->put($testPath, $testContent);
            $this->info('Файл загружен успешно');
            
            $exists = Storage::disk('s3')->exists($testPath);
            $this->info('Файл существует: ' . ($exists ? 'да' : 'нет'));
            
            $url = Storage::disk('s3')->url($testPath);
            $this->info('URL: ' . $url);
            
            Storage::disk('s3')->delete($testPath);
            $this->info('Тестовый файл удален');
            
        } catch (\Exception $e) {
            $this->error('Ошибка: ' . $e->getMessage());
        }
    }
}


