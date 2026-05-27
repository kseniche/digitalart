<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmailNotificationsEnabledTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_profile_does_not_expose_email_notifications_enabled(): void
    {
        $user = User::factory()->create([
            'email_notifications_enabled' => false,
        ]);

        $response = $this->getJson("/api/profiles/{$user->id}");

        $response->assertOk();
        $response->assertJsonMissingPath('email_notifications_enabled');
    }

    public function test_current_user_profile_includes_email_notifications_enabled(): void
    {
        $user = User::factory()->create([
            'email_notifications_enabled' => false,
        ]);

        $token = $user->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/profile');

        $response->assertOk();
        $response->assertJsonPath('email_notifications_enabled', false);
    }

    public function test_user_can_update_email_notifications_enabled(): void
    {
        $user = User::factory()->create([
            'email_notifications_enabled' => true,
        ]);

        $token = $user->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson('/api/profile', [
                'email_notifications_enabled' => false,
            ]);

        $response->assertOk();

        $user->refresh();
        $this->assertFalse($user->email_notifications_enabled);
    }
}

