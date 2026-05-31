import React from 'react';
import { isNearLimit, isOverLimit, stringLength } from '../../utils/fieldValidation';

/**
 * Счётчик символов с предупреждением при приближении к лимиту.
 */
function CharCounter({
  value,
  max,
  min = 0,
  hint = 'Обязательное поле',
  optionalHint = 'Необязательно',
  required = false,
}) {
  const len = stringLength(value);
  const over = isOverLimit(len, max);
  const warn = isNearLimit(len, max);

  let className = 'char-counter';
  if (over) {
    className += ' char-counter--over';
  } else if (warn) {
    className += ' char-counter--warn';
  }

  const leftHint = required ? hint : optionalHint;

  return (
    <div className={`ui-form-help ui-form-help-row ${className}`}>
      <span>
        {leftHint}
        {min > 0 && len > 0 && len < min ? ` · минимум ${min} символов` : ''}
        {over ? ' · превышен лимит' : warn ? ' · почти достигнут лимит' : ''}
      </span>
      <span aria-live="polite">
        {len} / {max}
      </span>
    </div>
  );
}

export default CharCounter;
