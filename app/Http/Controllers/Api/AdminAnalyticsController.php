<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AdminAnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AdminAnalyticsController extends Controller
{
    public function __construct(
        private readonly AdminAnalyticsService $analytics,
    ) {}

    public function index(Request $request): JsonResponse
    {
        try {
            $period = (string) $request->input('period', 'month');

            return response()->json($this->analytics->build($period));
        } catch (\Throwable $e) {
            Log::error('Admin analytics error: ' . $e->getMessage());

            return response()->json(['message' => 'Ошибка при загрузке аналитики'], 500);
        }
    }
}
