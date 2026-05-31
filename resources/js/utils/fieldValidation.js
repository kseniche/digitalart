import { CHAR_COUNTER_WARN_RATIO } from '../constants/fieldLimits';

export function stringLength(value) {
  return String(value ?? '').length;
}

export function isNearLimit(length, max) {
  return max > 0 && length / max >= CHAR_COUNTER_WARN_RATIO && length <= max;
}

export function isOverLimit(length, max) {
  return max > 0 && length > max;
}

export function validateRequired(value, fieldLabel) {
  if (!String(value ?? '').trim()) {
    return `${fieldLabel} обязательно для заполнения`;
  }
  return null;
}

export function validateMinLength(value, min, fieldLabel) {
  const len = stringLength(value);
  if (min > 0 && len > 0 && len < min) {
    return `${fieldLabel} должно содержать не менее ${min} символов`;
  }
  return null;
}

export function validateMaxLength(value, max, fieldLabel) {
  const len = stringLength(value);
  if (max > 0 && len > max) {
    return `${fieldLabel} не должно превышать ${max} символов (сейчас: ${len})`;
  }
  return null;
}

export function validateLengthRange(value, min, max, fieldLabel) {
  return (
    validateRequired(value, fieldLabel)
    || validateMinLength(value, min, fieldLabel)
    || validateMaxLength(value, max, fieldLabel)
  );
}
