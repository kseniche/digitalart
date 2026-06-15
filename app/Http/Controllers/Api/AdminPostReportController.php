<?php

namespace App\Http\Controllers\Api;

use App\Enums\PostReportStatus;
use App\Http\Controllers\Controller;
use App\Models\PostReport;
use App\Services\PostReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AdminPostReportController extends Controller
{
    public function __construct(
        private readonly PostReportService $postReports,
    ) {}

    public function stats(): JsonResponse
    {
        return response()->json([
            'pending' => PostReport::query()->where('status', PostReportStatus::Pending)->count(),
            'confirmed' => PostReport::query()->where('status', PostReportStatus::Confirmed)->count(),
            'rejected' => PostReport::query()->where('status', PostReportStatus::Rejected)->count(),
            'total' => PostReport::query()->count(),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $status = $request->input('status', 'pending');
            $perPage = min(max((int) $request->input('per_page', 15), 1), 50);

            $query = PostReport::query()
                ->with([
                    'reporter:id,name,user_surname,email,username',
                    'reviewer:id,name,user_surname',
                    'post' => fn ($q) => $q->withTrashed()
                        ->with(['author:id,name,user_surname,email,username,is_banned', 'author.roles'])
                        ->select([
                            'id', 'post_title', 'user_id', 'media_path', 'media_type',
                            'moderation_status', 'deleted_at',
                        ]),
                ]);

            if ($status !== 'all') {
                $query->where('status', $status);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->whereHas('post', fn ($pq) => $pq->withTrashed()
                        ->where('post_title', 'like', "%{$search}%"))
                        ->orWhereHas('reporter', fn ($uq) => $uq
                            ->where('email', 'like', "%{$search}%")
                            ->orWhere('username', 'like', "%{$search}%")
                            ->orWhere('name', 'like', "%{$search}%"));
                });
            }

            $reports = $query->orderByDesc('created_at')->paginate($perPage);

            $reports->getCollection()->transform(fn (PostReport $report) => $this->transformReport($report));

            return response()->json([
                'data' => $reports->items(),
                'current_page' => $reports->currentPage(),
                'last_page' => $reports->lastPage(),
                'per_page' => $reports->perPage(),
                'total' => $reports->total(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Admin post reports index error: '.$e->getMessage());

            return response()->json(['message' => 'Ошибка при загрузке жалоб'], 500);
        }
    }

    public function confirm(Request $request, int $id): JsonResponse
    {
        try {
            $report = PostReport::with(['post' => fn ($q) => $q->withTrashed(), 'reporter'])->findOrFail($id);

            if ($report->status !== PostReportStatus::Pending) {
                return response()->json(['message' => 'Жалоба уже рассмотрена'], 422);
            }

            $this->postReports->confirm($report, $request->user());

            return response()->json(['message' => 'Жалоба подтверждена. Публикация скрыта.']);
        } catch (\Throwable $e) {
            Log::error('Admin confirm post report error: '.$e->getMessage());

            return response()->json(['message' => 'Ошибка при подтверждении жалобы'], 500);
        }
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        try {
            $report = PostReport::with(['post' => fn ($q) => $q->withTrashed(), 'reporter'])->findOrFail($id);

            if ($report->status !== PostReportStatus::Pending) {
                return response()->json(['message' => 'Жалоба уже рассмотрена'], 422);
            }

            $this->postReports->reject($report, $request->user());

            return response()->json(['message' => 'Жалоба отклонена']);
        } catch (\Throwable $e) {
            Log::error('Admin reject post report error: '.$e->getMessage());

            return response()->json(['message' => 'Ошибка при отклонении жалобы'], 500);
        }
    }

    private function transformReport(PostReport $report): array
    {
        $post = $report->post;

        return [
            'id' => $report->id,
            'post_id' => $report->post_id,
            'reason' => $report->reason,
            'reason_label' => PostReport::reasonLabel($report->reason),
            'other_text' => $report->other_text,
            'status' => $report->status?->value ?? $report->status,
            'created_at' => $report->created_at?->toIso8601String(),
            'reviewed_at' => $report->reviewed_at?->toIso8601String(),
            'reporter' => $report->reporter ? [
                'id' => $report->reporter->id,
                'name' => $report->reporter->name,
                'user_surname' => $report->reporter->user_surname,
                'email' => $report->reporter->email,
                'username' => $report->reporter->username,
            ] : null,
            'reviewer' => $report->reviewer ? [
                'id' => $report->reviewer->id,
                'name' => $report->reviewer->name,
                'user_surname' => $report->reviewer->user_surname,
            ] : null,
            'post' => $post ? [
                'id' => $post->id,
                'post_title' => $post->post_title,
                'image_url' => $post->image_url,
                'media_type' => $post->media_type,
                'moderation_status' => $post->moderation_status,
                'deleted_at' => $post->deleted_at?->toIso8601String(),
                'author' => $post->author ? [
                    'id' => $post->author->id,
                    'name' => $post->author->name,
                    'user_surname' => $post->author->user_surname,
                    'email' => $post->author->email,
                    'username' => $post->author->username,
                    'is_banned' => (bool) $post->author->is_banned,
                    'is_admin' => $post->author->hasRole('admin'),
                ] : null,
            ] : null,
        ];
    }
}
