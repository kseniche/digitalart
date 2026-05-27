<?php

namespace App\Rules;

use App\Support\WebsiteHelper;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class WebsiteUrl implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value === null || $value === '') {
            return;
        }

        if (!WebsiteHelper::isValid((string) $value)) {
            $fail('Укажите корректный адрес сайта (например, example.com или https://example.com).');
        }
    }
}
