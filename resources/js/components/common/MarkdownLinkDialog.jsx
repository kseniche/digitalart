import React, { useState, useEffect } from 'react';

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

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(text.trim() || 'ссылка', url.trim() || 'https://');
  };

  return (
    <div className="markdown-link-dialog-overlay" onClick={onCancel} role="presentation">
      <form
        className="markdown-link-dialog"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h3 className="markdown-link-dialog__title">Вставить ссылку</h3>
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
          <button type="submit" className="btn btn-primary">
            Вставить
          </button>
        </div>
      </form>
    </div>
  );
}

export default MarkdownLinkDialog;
