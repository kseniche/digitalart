<?php

namespace Tests\Unit;

use App\Support\MediaUploadHelper;
use PHPUnit\Framework\TestCase;

class MediaUploadHelperTest extends TestCase
{
    public function test_parse_ini_size_megabytes(): void
    {
        $this->assertSame(64 * 1024 * 1024, MediaUploadHelper::parseIniSize('64M'));
        $this->assertSame(2 * 1024 * 1024, MediaUploadHelper::parseIniSize('2M'));
    }

    public function test_upload_max_exceeded_message_contains_php_hint(): void
    {
        $msg = MediaUploadHelper::formatUploadMaxExceededMessage(5 * 1024 * 1024, 2 * 1024 * 1024, 'test.mp4');

        $this->assertStringContainsString('upload_max_filesize', $msg);
        $this->assertStringContainsString('test.mp4', $msg);
    }
}
