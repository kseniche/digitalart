import { useState, useEffect, useRef } from 'react';
import { apiFetchLocal as apiFetch } from '../api';
import { markdownToSafeHtml } from '../utils/markdownPreview';

/**
 * Предпросмотр через API (MarkdownHelper) — как на странице публикации.
 * При ошибке сети — локальный fallback.
 */
export function useServerMarkdownPreview(markdown, enabled) {
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [usesServer, setUsesServer] = useState(true);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const source = markdown == null ? '' : String(markdown);
    if (!source.trim()) {
      setHtml('');
      setLoading(false);
      return undefined;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch('/api/markdown/preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ content: source }),
        });

        if (requestId !== requestIdRef.current) {
          return;
        }

        if (res.ok) {
          const data = await res.json();
          setHtml(data.html || '');
          setUsesServer(true);
        } else {
          setHtml(markdownToSafeHtml(source));
          setUsesServer(false);
        }
      } catch {
        if (requestId === requestIdRef.current) {
          setHtml(markdownToSafeHtml(source));
          setUsesServer(false);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [markdown, enabled]);

  return { html, loading, usesServer };
}
