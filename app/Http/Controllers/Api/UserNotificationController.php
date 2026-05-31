<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserNotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = min(50, max(5, (int) $request->input('per_page', 20)));

        $query = UserNotification::query()
            ->where('user_id', $request->user()->id)
            ->orderByDesc('created_at');

        if ($request->boolean('unread_only')) {
            $query->unread();
        }

        $paginator = $query->paginate($perPage);

        return response()->json([
            'data' => $paginator->getCollection()->map(fn (UserNotification $n) => $this->format($n)),
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'email_hint' => config('user_notifications.email_hint'),
        ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $count = UserNotification::query()
            ->where('user_id', $request->user()->id)
            ->unread()
            ->count();

        return response()->json(['unread_count' => $count]);
    }

    public function markRead(Request $request, int $id): JsonResponse
    {
        $notification = UserNotification::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        $notification->markAsRead();

        return response()->json([
            'message' => 'Уведомление отмечено прочитанным',
            'notification' => $this->format($notification->fresh()),
        ]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        UserNotification::query()
            ->where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'Все уведомления отмечены прочитанными']);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $notification = UserNotification::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        $notification->delete();

        return response()->json(['message' => 'Уведомление удалено']);
    }

    public function destroyAll(Request $request): JsonResponse
    {
        UserNotification::query()
            ->where('user_id', $request->user()->id)
            ->delete();

        return response()->json(['message' => 'Все уведомления удалены']);
    }

    private function format(UserNotification $n): array
    {
        return [
            'id' => $n->id,
            'type' => $n->type->value,
            'title' => $n->title,
            'body' => $n->body,
            'action_url' => $n->action_url,
            'meta' => $n->meta,
            'email_sent' => (bool) $n->email_sent,
            'read_at' => $n->read_at?->toIso8601String(),
            'is_read' => $n->read_at !== null,
            'created_at' => $n->created_at?->toIso8601String(),
        ];
    }
}
