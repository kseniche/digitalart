<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('app');
});

// Все остальные маршруты для React SPA
Route::get('/{any}', function () {
    return view('app');
})->where('any', '.*');
