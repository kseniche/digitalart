<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('app');
});

// Маршрут для ссылки сброса пароля из email (Laravel ожидает route('password.reset')).
Route::get('/reset-password/{token}', function () {
    return view('app');
})->name('password.reset');

// Все остальные маршруты для React SPA
Route::get('/{any}', function () {
    return view('app');
})->where('any', '.*');
