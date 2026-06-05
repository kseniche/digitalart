import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

function MarkdownLinkDialog({ open, initialText = '', onConfirm, onCancel }) {
  const [text, setText] = useState(initialText);
  const [url, setUrl] = useState('https://');

  useEffect(() => {
    if (open) {
      setText(initialText || '');
      setUrl('https://');
    }
  }, [open, initialText]);

  if (!open) {
    return null;
  }

  const handleConfirm = () => {
    onConfirm(text.trim() || 'ссылка', url.trim() || 'https://');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    }
  };

  return createPortal(
    <div className="markdown-link-dialog-overlay" onClick={onCancel} role="presentation">
      <div
        className="markdown-link-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="md-link-dialog-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <h3 id="md-link-dialog-title" className="markdown-link-dialog__title">Вставить ссылку</h3>
        <label className="form-label" htmlFor="md-link-text">
          Текст ссылки
        </label>
        <input
          id="md-link-text"
          type="text"
          className="form-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Например: Мой сайт"
          autoFocus
        />
        <label className="form-label" htmlFor="md-link-url" style={{ marginTop: '0.75rem' }}>
          Адрес (URL)
        </label>
        <input
          id="md-link-url"
          type="url"
          className="form-input"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
        />
        <div className="markdown-link-dialog__actions">
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            Отмена
          </button>
          <button type="button" className="btn btn-primary" onClick={handleConfirm}>
            Вставить
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default MarkdownLinkDialog;
