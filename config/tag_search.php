<?php

return [

    /*
    | Логирование поиска публикаций по тегам (GET /api/feed?tag=...).
    | Файл: storage/logs/tag-search.log
    */
    'enabled' => env('LOG_TAG_SEARCH', env('APP_DEBUG', false)),

];
