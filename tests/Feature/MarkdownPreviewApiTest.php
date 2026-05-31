<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MarkdownPreviewApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_gets_server_rendered_preview(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/markdown/preview', [
            'content' => "# Заголовок\n\n**жирный** и [ссылка](https://example.com)",
        ]);

        $response->assertOk();
        $html = $response->json('html');
        $this->assertStringContainsString('<h1>', $html);
        $this->assertStringContainsString('<strong>', $html);
        $this->assertStringContainsString('href="https://example.com"', $html);
    }

    public function test_preview_supports_horizontal_rule(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/markdown/preview', [
            'content' => "Текст\n\n---\n\nНиже",
        ]);

        $response->assertOk();
        $this->assertStringContainsString('<hr', $response->json('html'));
    }
}
