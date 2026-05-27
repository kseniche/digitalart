<!doctype html>
<html lang="ru">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <link rel="icon" href="{{ asset('images/logo.png') }}" type="image/png">
        <link rel="apple-touch-icon" href="{{ asset('images/logo.png') }}">
        <title>Цифровое искусство</title>
        @viteReactRefresh
        @vite(['resources/css/app.css','resources/js/app.jsx'])
    </head>
    <body>
        <div id="root"></div>
    </body>
</html>


