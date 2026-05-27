import React from 'react';
import '../../../css/app.css';

function Alert({ type = 'error', message = '', onClose = null, className = '' }) {
  if (!message) return null;

  const isSuccess = type === 'success';
  const styles = isSuccess
    ? 'ui-alert ui-alert--success'
    : 'ui-alert ui-alert--error';

  return (
    <div
      className={`${styles}${className ? ` ${className}` : ''}`}
    >
      <span>{message}</span>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="ui-alert__close"
          aria-label="Закрыть уведомление"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

export default Alert;
