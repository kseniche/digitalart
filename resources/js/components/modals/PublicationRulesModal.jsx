import React from 'react';
import { PublicationRulesSection } from '../../content/communityRulesContent';

function PublicationRulesModal({ open, onClose }) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content publication-rules-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="publication-rules-title"
        aria-modal="true"
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Закрыть">
          ×
        </button>
        <h2 id="publication-rules-title" style={{ marginBottom: '1rem', textAlign: 'center', color: '#1f2937' }}>
          Правила публикации
        </h2>
        <div
          className="publication-rules-modal__body"
          style={{
            fontSize: '0.9375rem',
            lineHeight: 1.6,
            color: '#374151',
            maxHeight: '60vh',
            overflowY: 'auto',
          }}
        >
          <p style={{ marginBottom: '1rem' }}>
            Размещая работы в сообществе, вы подтверждаете, что ознакомлены с правилами и согласны их соблюдать.
            Нарушение правил может привести к отклонению публикации или ограничению доступа к аккаунту.
          </p>
          <PublicationRulesSection />
        </div>
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
}

export default PublicationRulesModal;
