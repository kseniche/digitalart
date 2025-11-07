<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Storage;
use League\Flysystem\Filesystem as Flysystem;
use Illuminate\Filesystem\FilesystemAdapter;
use Aws\S3\S3Client;
use League\Flysystem\AwsS3V3\AwsS3V3Adapter;

class StorageServiceProvider extends ServiceProvider
{
    public function register()
    {
        //
    }

    public function boot()
    {
        Storage::extend('s3', function ($app, $config) {
            $client = new S3Client([
                'credentials' => [
                    'key'    => $config['key'],
                    'secret' => $config['secret'],
                ],
                'region' => $config['region'],
                'version' => 'latest',
                'endpoint' => $config['endpoint'],
                'use_path_style_endpoint' => $config['use_path_style_endpoint'] ?? true,
                'http' => [
                    'verify' => $config['options']['verify'] ?? false,
                    'timeout' => 30,
                    'connect_timeout' => 10,
                ]
            ]);

            $adapter = new AwsS3V3Adapter($client, $config['bucket'], $config['root'] ?? '');

            $flysystem = new Flysystem($adapter, [
                'visibility' => $config['visibility'] ?? 'public',
                'directory_visibility' => $config['visibility'] ?? 'public',
            ]);

            // Добавляем URL в конфигурацию для поддержки url() метода
            $config['url'] = $config['url'] ?? ($config['endpoint'] . '/' . $config['bucket']);

            return new FilesystemAdapter($flysystem, $adapter, $config);
        });
    }
}