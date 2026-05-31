/**
 * Вставка Markdown в textarea без знания синтаксиса пользователем.
 * Совместимо с League\CommonMark на сервере.
 */

export function applyMarkdownWrap(textarea, before, after = '', placeholder = '') {
  if (!textarea) {
    return null;
  }

  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? 0;
  const value = textarea.value ?? '';
  const selected = value.substring(start, end) || placeholder;
  const insertion = before + selected + after;
  const newValue = value.substring(0, start) + insertion + value.substring(end);
  const cursorStart = start + before.length;
  const cursorEnd = cursorStart + selected.length;

  return { newValue, cursorStart, cursorEnd };
}

export function applyMarkdownPrefix(textarea, prefix, placeholder = '') {
  if (!textarea) {
    return null;
  }

  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? 0;
  const value = textarea.value ?? '';
  const selected = value.substring(start, end);
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const lineEnd = value.indexOf('\n', end);
  const blockEnd = lineEnd === -1 ? value.length : lineEnd;
  const block = value.substring(lineStart, blockEnd);
  const lines = (selected || block || placeholder).split('\n');
  const prefixed = lines
    .map((line) => (line.startsWith(prefix) ? line : `${prefix}${line}`))
    .join('\n');
  const newValue = value.substring(0, lineStart) + prefixed + value.substring(blockEnd);

  return {
    newValue,
    cursorStart: lineStart,
    cursorEnd: lineStart + prefixed.length,
  };
}

export function applyMarkdownInsert(textarea, snippet) {
  if (!textarea) {
    return null;
  }

  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? 0;
  const value = textarea.value ?? '';
  const lead = start > 0 && value[start - 1] !== '\n' ? '\n\n' : (start > 0 ? '\n' : '');
  const trail = '\n';
  const insertion = lead + snippet + trail;
  const newValue = value.substring(0, start) + insertion + value.substring(end);
  const cursorStart = start + lead.length + snippet.length;

  return { newValue, cursorStart, cursorEnd: cursorStart };
}

export function applyMarkdownLink(textarea, linkText, url) {
  if (!textarea) {
    return null;
  }

  const text = (linkText || 'ссылка').trim();
  const href = (url || 'https://').trim();
  const markdown = `[${text}](${href})`;

  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? 0;
  const value = textarea.value ?? '';
  const newValue = value.substring(0, start) + markdown + value.substring(end);
  const cursorStart = start + markdown.length;

  return { newValue, cursorStart, cursorEnd: cursorStart };
}

/**
 * Панель инструментов: подписи для пользователя, синтаксис вставляется автоматически.
 */
export const MARKDOWN_TOOLBAR_ACTIONS = [
  {
    id: 'bold',
    label: 'Ж',
    labelClass: 'markdown-textarea__btn--bold',
    tooltip: 'Жирный текст',
    type: 'wrap',
    before: '**',
    after: '**',
    placeholder: 'текст',
  },
  {
    id: 'italic',
    label: 'К',
    labelClass: 'markdown-textarea__btn--italic',
    tooltip: 'Курсив',
    type: 'wrap',
    before: '*',
    after: '*',
    placeholder: 'текст',
  },
  { id: 'sep1', type: 'separator' },
  {
    id: 'h1',
    label: 'Заг',
    tooltip: 'Заголовок',
    type: 'prefix',
    prefix: '# ',
    placeholder: 'Заголовок',
  },
  {
    id: 'h2',
    label: 'Подзаг',
    tooltip: 'Подзаголовок',
    type: 'prefix',
    prefix: '## ',
    placeholder: 'Подзаголовок',
  },
  { id: 'sep2', type: 'separator' },
  {
    id: 'list',
    label: '•',
    tooltip: 'Маркированный список',
    type: 'prefix',
    prefix: '- ',
    placeholder: 'пункт списка',
  },
  {
    id: 'olist',
    label: '1.',
    tooltip: 'Нумерованный список',
    type: 'prefix',
    prefix: '1. ',
    placeholder: 'пункт списка',
  },
  { id: 'sep3', type: 'separator' },
  {
    id: 'quote',
    label: '„',
    tooltip: 'Цитата',
    type: 'prefix',
    prefix: '> ',
    placeholder: 'текст цитаты',
  },
  {
    id: 'link',
    label: '🔗',
    tooltip: 'Вставить ссылку',
    type: 'link',
  },
  {
    id: 'code',
    label: '</>',
    tooltip: 'Фрагмент кода',
    type: 'wrap',
    before: '`',
    after: '`',
    placeholder: 'код',
  },
  {
    id: 'hr',
    label: '—',
    tooltip: 'Горизонтальный разделитель',
    type: 'insert',
    snippet: '---',
  },
];
