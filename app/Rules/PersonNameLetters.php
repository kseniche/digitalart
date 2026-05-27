<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Имя или фамилия: только буквы (Unicode), без цифр;
 * части из букв могут разделяться одним пробелом, дефисом или апострофом (ASCII ' или типографский ’),
 * например: Анна-Мария, O'Brien, Van der Berg.
 */
class PersonNameLetters implements ValidationRule
{
    public function __construct(
        private readonly bool $allowEmpty = false
    ) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            $fail('Значение должно быть строкой.');

            return;
        }

        $trimmed = trim($value);

        if ($this->allowEmpty && $trimmed === '') {
            return;
        }

        // Между группами букв — ровно один разделитель: пробел (U+0020), дефис или апостроф (U+0027 / U+2019).
        if (! preg_match('/^[\p{L}]+(?:[ \x{27}\x{2019}\-][\p{L}]+)*$/u', $trimmed)) {
            $fail("Допускаются только буквы; части имени или фамилии разделяйте одним пробелом, дефисом или апострофом (например, Анна-Мария, O'Brien, Van der Berg).");
        }
    }
}
