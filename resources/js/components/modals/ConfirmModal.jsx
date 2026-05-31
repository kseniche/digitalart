import React from 'react';
import '../../../css/app.css';

/**
 * Универсальное модальное окно подтверждения (критерий 2.5.5).
 * Замена window.confirm для критичных действий.
 */
function ConfirmModal({
  open,
  title = 'Подтверждение',
  message = 'Вы уверены?',
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  variant = 'danger',
  onConfirm,
  onClose,
  overlayClassName = '',
  isLoading = false,
  reasonLabel = '',
  reasonPlaceholder = '',
  reasonValue = '',
  onReasonChange,
}) {
  if (!open) return null;

  const handleConfirm = () => {
    if (typeof onConfirm === 'function') onConfirm();
  };

  const isDanger = variant === 'danger';

  return (
    <div
      className={`modal-overlay${overlayClassName ? ` ${overlayClassName}` : ''}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '440px' }}
      >
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="Закрыть"
        >
          ×
        </button>
        <h2
          id="confirm-modal-title"
          className="ui-modal-title"
        >
          {title}
        </h2>
        <p className="ui-modal-text">
          {message}
        </p>
        {typeof onReasonChange === 'function' && (
          <div style={{ marginBottom: '1rem' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '0.4rem',
                color: '#374151',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.9rem',
              }}
            >
              {reasonLabel || 'Причина'}
            </label>
            <textarea
              value={reasonValue}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder={reasonPlaceholder || 'Укажите причину'}
              rows={3}
              className="form-input"
              style={{ resize: 'vertical' }}
            />
          </div>
        )}
        <div className="ui-actions-row">
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={isDanger ? 'btn btn-danger' : 'btn btn-primary'}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? '...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
