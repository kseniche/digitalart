import React, { useRef, useCallback, useState } from 'react';
import {
  applyMarkdownWrap,
  applyMarkdownPrefix,
  applyMarkdownInsert,
  applyMarkdownLink,
  MARKDOWN_TOOLBAR_ACTIONS,
} from '../../utils/markdownToolbar';
import { useServerMarkdownPreview } from '../../hooks/useServerMarkdownPreview';
import MarkdownLinkDialog from './MarkdownLinkDialog';

function MarkdownTextarea({
  id,
  name,
  value,
  onChange,
  className = '',
  placeholder = '',
  rows = 6,
  error = false,
  helpText = 'Выделите фрагмент текста и нажмите кнопку на панели — форматирование применится автоматически. Вкладка «Предпросмотр» показывает вид публикации после сохранения.',
  disabled = false,
  maxLength,
}) {
  const textareaRef = useRef(null);
  const [viewMode, setViewMode] = useState('edit');
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkSelectionText, setLinkSelectionText] = useState('');

  const { html: previewHtml, loading: previewLoading } = useServerMarkdownPreview(
    value,
    viewMode === 'preview'
  );

  const commitChange = useCallback(
    (result) => {
      if (!result) {
        return;
      }
      const textarea = textareaRef.current;
      onChange({
        target: {
          name: name || textarea?.name,
          value: result.newValue,
        },
      });
      requestAnimationFrame(() => {
        textarea?.focus();
        textarea?.setSelectionRange(result.cursorStart, result.cursorEnd);
      });
    },
    [name, onChange]
  );

  const runAction = useCallback(
    (action) => {
      if (action.type === 'separator' || disabled) {
        return;
      }

      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }

      if (action.type === 'link') {
        const start = textarea.selectionStart ?? 0;
        const end = textarea.selectionEnd ?? 0;
        setLinkSelectionText(textarea.value.substring(start, end));
        setLinkDialogOpen(true);
        return;
      }

      let result;
      if (action.type === 'prefix') {
        result = applyMarkdownPrefix(textarea, action.prefix, action.placeholder);
      } else if (action.type === 'insert') {
        result = applyMarkdownInsert(textarea, action.snippet);
      } else {
        result = applyMarkdownWrap(textarea, action.before, action.after, action.placeholder);
      }

      commitChange(result);
    },
    [commitChange, disabled]
  );

  const handleToolbarClick = useCallback(
    (action) => {
      if (viewMode === 'preview') {
        setViewMode('edit');
        requestAnimationFrame(() => runAction(action));
        return;
      }
      runAction(action);
    },
    [runAction, viewMode]
  );

  const handleLinkConfirm = (text, url) => {
    setLinkDialogOpen(false);
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    commitChange(applyMarkdownLink(textarea, text, url));
  };

  const isPreview = viewMode === 'preview';

  return (
    <div className={`markdown-textarea${error ? ' markdown-textarea--error' : ''}`}>
      <div className="markdown-textarea__header">
        <div className="markdown-textarea__toolbar-wrap">
          <div className="markdown-textarea__toolbar" role="toolbar" aria-label="Форматирование текста">
            {MARKDOWN_TOOLBAR_ACTIONS.map((action) =>
              action.type === 'separator' ? (
                <span key={action.id} className="markdown-textarea__sep" aria-hidden="true" />
              ) : (
                <button
                  key={action.id}
                  type="button"
                  className={`markdown-textarea__btn ${action.labelClass || ''}`.trim()}
                  data-tooltip={action.tooltip}
                  aria-label={action.tooltip}
                  disabled={disabled}
                  onClick={() => handleToolbarClick(action)}
                >
                  {action.label}
                </button>
              )
            )}
          </div>
        </div>

        <div className="markdown-textarea__tabs" role="tablist" aria-label="Режим редактора">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'edit'}
            className={`markdown-textarea__tab${viewMode === 'edit' ? ' markdown-textarea__tab--active' : ''}`}
            onClick={() => setViewMode('edit')}
            disabled={disabled}
          >
            Редактор
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'preview'}
            className={`markdown-textarea__tab${viewMode === 'preview' ? ' markdown-textarea__tab--active' : ''}`}
            onClick={() => setViewMode('preview')}
          >
            Предпросмотр
          </button>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        className={`form-input markdown-textarea__input ${error ? 'error' : ''} ${className}`.trim()}
        placeholder={placeholder}
        rows={rows}
        style={{
          resize: 'vertical',
          display: viewMode === 'edit' ? 'block' : 'none',
        }}
        disabled={disabled}
        aria-hidden={viewMode !== 'edit'}
      />

      {isPreview && (
        <div
          className="markdown-textarea__preview post-content-html post-detail-content"
          role="tabpanel"
          aria-label="Предпросмотр описания"
          aria-busy={previewLoading}
        >
          {previewLoading && (
            <p className="markdown-textarea__preview-empty">Формируем предпросмотр…</p>
          )}
          {!previewLoading && previewHtml && (
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          )}
          {!previewLoading && !previewHtml && (
            <p className="markdown-textarea__preview-empty">Нет текста для предпросмотра</p>
          )}
        </div>
      )}

      {helpText && <div className="ui-form-help">{helpText}</div>}

      <MarkdownLinkDialog
        open={linkDialogOpen}
        initialText={linkSelectionText}
        onConfirm={handleLinkConfirm}
        onCancel={() => setLinkDialogOpen(false)}
      />
    </div>
  );
}

export default MarkdownTextarea;
