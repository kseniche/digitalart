<?php

namespace App\Helpers;

use League\CommonMark\CommonMarkConverter;

class MarkdownHelper
{
    private static ?CommonMarkConverter $converter = null;

    /**
     * Конвертирует Markdown в безопасный HTML (критерий 3.3).
     * Разрешены: p, br, strong, em, a, ul, ol, li, h1, h2, h3, code, pre.
     */
    public static function toSafeHtml(?string $markdown): string
    {
        $markdown = $markdown === null ? '' : (is_string($markdown) ? $markdown : (string) $markdown);
        if (trim($markdown) === '') {
            return '';
        }

        try {
            if (self::$converter === null) {
                self::$converter = new CommonMarkConverter();
            }

            $html = self::$converter->convert($markdown)->getContent();
        } catch (\Throwable $e) {
            return htmlspecialchars($markdown, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }

        $allowed = '<p><br><strong><b><em><i><a><ul><ol><li><h1><h2><h3><h4><code><pre>';
        $html = strip_tags($html, $allowed);

        $html = preg_replace_callback('/<a\s+([^>]*?)>/i', function ($m) {
            $attrs = $m[1];
            if (preg_match('/href\s*=\s*["\']?\s*(javascript|data):/i', $attrs)) {
                return '<a rel="noopener noreferrer" target="_blank">';
            }
            if (strpos($attrs, 'target=') === false) {
                $attrs .= ' target="_blank" rel="noopener noreferrer"';
            }
            return '<a ' . trim($attrs) . '>';
        }, $html);

        return $html ?? '';
    }
}
