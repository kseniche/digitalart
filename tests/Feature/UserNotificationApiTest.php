<?php

namespace Tests\Feature;

use App\Enums\UserNotificationType;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserNotificationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_list_and_manage_notifications(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        UserNotification::create([
            'user_id' => $user->id,
            'type' => UserNotificationType::PostApproved,
            'title' => 'Публикация одобрена',
            'body' => 'Тестовое уведомление',
            'action_url' => '/post/1',
            'email_sent' => true,
        ]);

        $this->getJson('/api/notifications/unread-count')
            ->assertOk()
            ->assertJsonPath('unread_count', 1);

        $this->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonPath('data.0.title', 'Публикация одобрена')
            ->assertJsonPath('email_hint', config('user_notifications.email_hint'));

        $notificationId = UserNotification::first()->id;

        $this->postJson("/api/notifications/{$notificationId}/read")
            ->assertOk();

        $this->assertNotNull(UserNotification::find($notificationId)->read_at);

        $this->getJson('/api/notifications/unread-count')
            ->assertJsonPath('unread_count', 0);

        $this->deleteJson("/api/notifications/{$notificationId}")
            ->assertOk();

        $this->assertDatabaseMissing('user_notifications', ['id' => $notificationId]);
    }

    public function test_cannot_access_other_users_notification(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $notification = UserNotification::create([
            'user_id' => $owner->id,
            'type' => UserNotificationType::AccountUnbanned,
            'title' => 'Test',
            'body' => 'Body',
            'email_sent' => false,
        ]);

        Sanctum::actingAs($other);

        $this->postJson("/api/notifications/{$notification->id}/read")->assertNotFound();
        $this->deleteJson("/api/notifications/{$notification->id}")->assertNotFound();
    }
}
