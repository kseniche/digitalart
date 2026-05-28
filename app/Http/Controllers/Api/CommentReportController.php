<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Comment;
use App\Models\CommentReport;
use App\Services\CommentModerationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CommentReportController extends Controller
{
    public function __construct(
        private readonly CommentModerationService $commentModeration
    ) {}

    public function store(Request $request, Comment $comment): JsonResponse
    {
        $reasonKeys = array_keys(config('comment_moderation.report_reasons', []));

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

        if ($comment->user_id === $request->user()->id) {
            return response()->json(['message' => 'Нельзя пожаловаться на свой комментарий'], 422);
        }

        if ($comment->deleted_at || $comment->moderation_status !== 'approved') {
            return response()->json(['message' => 'Комментарий недоступен'], 404);
        }

        $exists = CommentReport::query()
            ->where('comment_id', $comment->id)
            ->where('user_id', $request->user()->id)
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'Вы уже отправляли жалобу на этот комментарий'], 422);
        }

        CommentReport::create([
            'comment_id' => $comment->id,
            'user_id' => $request->user()->id,
            'reason' => $data['reason'],
            'other_text' => $data['reason'] === 'other' ? trim((string) $data['other_text']) : null,
        ]);

        $comment->refresh();
        $this->commentModeration->applyReportAndMaybeHide($comment);

        return response()->json([
            'message' => 'Жалоба принята. Комментарий будет проверен модератором.',
        ], 201);
    }

    public function reasons(): JsonResponse
    {
        $reasons = [];
        foreach (config('comment_moderation.report_reasons', []) as $key => $label) {
            $reasons[] = ['value' => $key, 'label' => $label];
        }

        return response()->json(['reasons' => $reasons]);
    }
}
