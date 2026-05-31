<?php

namespace Tests\Unit;

use App\Support\PostTags;
use Tests\TestCase;

class PostTagsTest extends TestCase
{
    public function test_parse_json_array_string(): void
    {
        $this->assertSame(['digital-art', 'pixel-art'], PostTags::parse('["digital-art","pixel-art"]'));
    }

    public function test_parse_json_encoded_csv_string(): void
    {
        $raw = '"3d,\u0441\u043a\u0443\u043b\u044c\u043f\u0442\u0443\u0440\u0430,blender,\u043c\u0435\u0447\u0442\u044b"';
        $tags = PostTags::parse($raw);
        $this->assertContains('3d', $tags);
        $this->assertContains('скульптура', $tags);
        $this->assertContains('мечты', $tags);
    }

    public function test_parse_csv(): void
    {
        $this->assertSame(['a', 'b'], PostTags::parse('a, b'));
    }

    public function test_any_contains_substring(): void
    {
        $this->assertTrue(PostTags::anyContainsSubstring(['digital-art'], 'art'));
        $this->assertFalse(PostTags::anyContainsSubstring(['illustration', 'photography'], 'art'));
        $this->assertTrue(PostTags::anyContainsSubstring(['art'], 'art'));
    }

    public function test_normalize_for_storage_deduplicates_case_insensitive(): void
    {
        $normalized = PostTags::normalizeForStorage('Digital-Art, digital-art, DIGITAL-ART, pixel');
        $this->assertSame(['Digital-Art', 'pixel'], $normalized);
    }

    public function test_normalize_for_storage_trims_and_skips_empty(): void
    {
        $this->assertSame(['art'], PostTags::normalizeForStorage(' art , , '));
    }

    public function test_normalize_and_validate_rejects_too_many_tags(): void
    {
        config(['post_tags.max_count' => 3]);

        $this->expectException(\Illuminate\Validation\ValidationException::class);
        PostTags::normalizeAndValidate('a, b, c, d');
    }

    public function test_normalize_and_validate_accepts_within_limits(): void
    {
        config(['post_tags.max_count' => 5, 'post_tags.max_tag_length' => 50, 'post_tags.max_input_length' => 500]);

        $result = PostTags::normalizeAndValidate('digital-art, pixel');
        $this->assertSame(['digital-art', 'pixel'], $result);
    }
}
