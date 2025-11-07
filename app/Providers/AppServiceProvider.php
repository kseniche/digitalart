<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Регистрация сервисов приложения
     */
    public function register(): void
    {
        //
    }

    /**
     * Загрузка сервисов приложения
     */
    public function boot(): void
    {
        // Здесь можно добавить глобальные настройки приложения
    }
}
