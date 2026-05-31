<?php

namespace App\Http\Controllers\Api;

use App\Helpers\MarkdownHelper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MarkdownPreviewController extends Controller
{
    /**
     * Предпросмотр описания — тот же рендерер, что для post_content_html на странице публикации.
     */
    public function preview(Request $request): JsonResponse
    {
        $data = $request->validate([
            'content' => ['nullable', 'string', 'max:50000'],
        ]);

        $html = MarkdownHelper::toSafeHtml($data['content'] ?? '');

        return response()->json(['html' => $html]);
    }
}
