<?php

namespace App\Rules;

use App\Support\PhoneHelper;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class InternationalPhone implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value === null || $value === '') {
            return;
        }

        if (!PhoneHelper::isValid((string) $value)) {
            $fail('Укажите корректный международный номер телефона (формат E.164, например +12025550123).');
        }
    }
}
