<?php

namespace Tests\Unit;

use App\Support\PhoneHelper;
use PHPUnit\Framework\TestCase;

class PhoneHelperTest extends TestCase
{
    public function test_normalizes_russian_mobile_to_e164(): void
    {
        $this->assertSame('+79001234567', PhoneHelper::normalize('8 (900) 123-45-67'));
        $this->assertSame('+79001234567', PhoneHelper::normalize('+7 900 123 45 67'));
    }

    public function test_normalizes_us_number_to_e164(): void
    {
        $this->assertSame('+12025550123', PhoneHelper::normalize('+1 (202) 555-0123'));
    }

    public function test_normalizes_german_number_to_e164(): void
    {
        $this->assertSame('+491701234567', PhoneHelper::normalize('+49 170 1234567'));
    }

    public function test_rejects_invalid_numbers(): void
    {
        $this->assertFalse(PhoneHelper::isValid('+12345'));
        $this->assertFalse(PhoneHelper::isValid('123'));
    }
}
