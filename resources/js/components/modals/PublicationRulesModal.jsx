import React from 'react';

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
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            <li style={{ marginBottom: '0.65rem' }}>
              Публикации должны относиться к тематике цифрового искусства: иллюстрация, 3D, концепт-арт,
              фотоманипуляция, анимация и смежные направления.
            </li>
            <li style={{ marginBottom: '0.65rem' }}>
              Запрещена нецензурная лексика в названии, описании, тегах и загружаемых материалах.
            </li>
            <li style={{ marginBottom: '0.65rem' }}>
              Запрещены оскорбления, угрозы, дискриминация и иные формы токсичного поведения.
            </li>
            <li style={{ marginBottom: '0.65rem' }}>
              Запрещён спам, навязчивая реклама и повторная публикация одного и того же контента без смысла для сообщества.
            </li>
            <li style={{ marginBottom: '0.65rem' }}>
              Запрещено размещение чужого контента без разрешения автора. Допускаются только работы, права на которые у вас есть.
            </li>
            <li style={{ marginBottom: '0.65rem' }}>
              Публикации, не относящиеся к тематике сообщества, могут быть отклонены модератором.
            </li>
            <li>
              Все публикации проходят автоматическую и административную проверку. Решение модерации является окончательным
              в рамках правил платформы.
            </li>
          </ul>
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
