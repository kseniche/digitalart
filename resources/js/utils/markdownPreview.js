import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: false,
  typographer: false,
});

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'a', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'code', 'pre', 'hr',
];

const ALLOWED_ATTR = ['href', 'target', 'rel'];

/**
 * Предпросмотр Markdown: близко к серверному CommonMark + тот же whitelist, что MarkdownHelper::toSafeHtml.
 */
export function markdownToSafeHtml(markdown) {
  const source = markdown == null ? '' : String(markdown);
  if (!source.trim()) {
    return '';
  }

  let html;
  try {
    html = md.render(source);
  } catch {
    return escapeHtml(source);
  }

  html = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });

  if (typeof document !== 'undefined') {
    const wrap = document.createElement('div');
    wrap.innerHTML = html;
    wrap.querySelectorAll('a').forEach((anchor) => {
      const href = anchor.getAttribute('href') || '';
      if (/^\s*(javascript|data):/i.test(href)) {
        anchor.removeAttribute('href');
      }
      if (!anchor.getAttribute('target')) {
        anchor.setAttribute('target', '_blank');
        anchor.setAttribute('rel', 'noopener noreferrer');
      }
    });
    html = wrap.innerHTML;
  }

  return html;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
