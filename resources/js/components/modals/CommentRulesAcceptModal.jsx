import React, { useState } from 'react';
import { Link } from 'react-router-dom';

function CommentRulesAcceptModal({ open, onAccept, onClose, isLoading = false }) {
  const [checked, setChecked] = useState(false);

  if (!open) {
    return null;
  }

  const handleClose = () => {
    if (!isLoading) {
      setChecked(false);
      onClose?.();
    }
  };

  const handleAccept = () => {
    if (checked && !isLoading) {
      onAccept?.();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose} role="dialog" aria-modal="true">
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px' }}
      >
        <button type="button" className="modal-close" onClick={handleClose} aria-label="Закрыть" disabled={isLoading}>
          ×
        </button>
        <h2 className="ui-modal-title">Правила комментариев</h2>
        <p className="ui-modal-text" style={{ marginBottom: '1rem' }}>
          Перед публикацией комментариев ознакомьтесь с правилами сообщества. Комментарии с
          нецензурной лексикой, рекламой, спамом, оскорблениями и иными нарушениями автоматически
          удаляются системой модерации без возможности восстановления.
        </p>
        <p style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
          <Link to="/community-rules" target="_blank" rel="noopener noreferrer" style={{ color: '#7B0000' }}>
            Полные правила сообщества
          </Link>
        </p>
        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
            marginBottom: '1.25rem',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
            lineHeight: 1.5,
          }}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            disabled={isLoading}
            style={{ marginTop: '0.2rem' }}
          />
          <span>Я ознакомился(ась) с правилами сообщества и принимаю их.</span>
        </label>
        <div className="ui-actions-row">
          <button type="button" className="btn btn-outline" onClick={handleClose} disabled={isLoading}>
            Отмена
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleAccept}
            disabled={!checked || isLoading}
          >
            {isLoading ? 'Сохранение…' : 'Продолжить'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CommentRulesAcceptModal;
