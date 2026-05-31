import React from 'react';

/**
 * Кнопка-иконка с подписью на широких экранах (touch ≥44px, aria-label всегда).
 */
function IconButton({
  label,
  onClick,
  disabled = false,
  variant = 'outline',
  className = '',
  children,
}) {
  return (
    <button
      type="button"
      className={`ui-icon-btn ui-icon-btn--action ui-icon-btn--${variant}${className ? ` ${className}` : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      <span className="ui-icon-btn__glyph" aria-hidden="true">
        {children}
      </span>
      <span className="ui-icon-btn__text">{label}</span>
    </button>
  );
}

export default IconButton;
