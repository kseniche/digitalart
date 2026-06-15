<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserNotificationType;
use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Models\PostReport;
use App\Services\UserNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PostReportController extends Controller
{
    public function __construct(
        private readonly UserNotificationService $userNotifications,
    ) {}

    public function store(Request $request, Post $post): JsonResponse
    {
        $reasonKeys = array_keys(config('post_reports.report_reasons', []));

        $data = $request->validate([
            'reason' => ['required', 'string', Rule::in($reasonKeys)],
            'other_text' => ['nullable', 'string', 'max:1000'],
        ], [
            'reason.required' => 'Укажите причину жалобы',
            'reason.in' => 'Недопустимая причина жалобы',
        ]);

        if ($data['reason'] === 'other' && trim((string) ($data['other_text'] ?? '')) === '') {
            return response()->json([
                'message' => 'Опишите причину жалобы',
                'errors' => ['other_text' => ['Укажите текст для варианта «Другое»']],
            ], 422);
        }

        if ((int) $post->user_id === (int) $request->user()->id) {
            return response()->json(['message' => 'Нельзя пожаловаться на свою публикацию'], 403);
        }

        if ($post->trashed() || ! $post->isPubliclyVisible()) {
            return response()->json(['message' => 'Публикация недоступна'], 404);
        }

        $exists = PostReport::query()
            ->where('post_id', $post->id)
            ->where('user_id', $request->user()->id)
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'Вы уже отправляли жалобу на эту публикацию'], 422);
        }

        $report = PostReport::create([
            'post_id' => $post->id,
            'user_id' => $request->user()->id,
            'reason' => $data['reason'],
            'other_text' => $data['reason'] === 'other' ? trim((string) $data['other_text']) : null,
        ]);

        $this->userNotifications->notify(
            $request->user(),
            UserNotificationType::PostReportSubmitted,
            [
                'title' => $post->post_title ?? 'Публикация',
                'post_id' => (string) $post->id,
            ],
            null,
            ['post_id' => $post->id, 'report_id' => $report->id]
        );

        return response()->json([
            'message' => 'Жалоба принята. Публикация будет проверена модератором.',
        ], 201);
    }

    public function reasons(): JsonResponse
    {
        $reasons = [];
        foreach (config('post_reports.report_reasons', []) as $key => $label) {
            $reasons[] = ['value' => $key, 'label' => $label];
        }

        return response()->json(['reasons' => $reasons]);
    }
}
