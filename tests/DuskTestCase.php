<?php

namespace Tests;

use Laravel\Dusk\TestCase as BaseTestCase;
use PHPUnit\Framework\Attributes\BeforeClass;

/**
 * Базовый класс для e2e-тестов Dusk (критерий 2.7.8).
 * Перед запуском: php artisan serve (или иной сервер) и при необходимости ChromeDriver.
 */
abstract class DuskTestCase extends BaseTestCase
{
    /**
     * Подготовка: запуск ChromeDriver на порту 9515.
     */
    #[BeforeClass]
    public static function prepare(): void
    {
        if (! static::runningInSail()) {
            static::startChromeDriver(['--port=9515']);
        }
    }

}
