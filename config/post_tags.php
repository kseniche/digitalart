<?php

return [
    /** Максимум уникальных тегов на публикацию */
    'max_count' => (int) env('POST_TAGS_MAX_COUNT', 20),

    /** Максимальная длина одного тега (символы) */
    'max_tag_length' => (int) env('POST_TAGS_MAX_TAG_LENGTH', 50),

    /** Максимальная длина сырой строки тегов в запросе */
    'max_input_length' => (int) env('POST_TAGS_MAX_INPUT_LENGTH', 500),
];
