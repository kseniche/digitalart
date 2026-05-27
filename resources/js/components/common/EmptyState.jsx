import React from 'react';

function EmptyState({ title, text = '', actions = null, className = '', compact = false }) {
  return (
    <div className={`ui-empty-state${compact ? ' ui-empty-state--compact' : ''}${className ? ` ${className}` : ''}`}>
      {title && <p className="ui-empty-state__title">{title}</p>}
      {text && <p className="ui-empty-state__text">{text}</p>}
      {actions ? <div className="ui-empty-state__actions">{actions}</div> : null}
    </div>
  );
}

export default EmptyState;
