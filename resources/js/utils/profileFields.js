import { AsYouType, parsePhoneNumberFromString } from 'libphonenumber-js';

/** Единый формат хранения: E.164 (например +79001234567). */

/** Максимум цифр в международном номере (стандарт E.164). */
export const MAX_PHONE_DIGITS = 15;

function toInternationalInput(value) {
  const raw = String(value ?? '');
  const digitsAndPlus = raw.replace(/[^\d+]/g, '');
  if (!digitsAndPlus) {
    return '';
  }

  const digitsOnly = digitsAndPlus.replace(/\D/g, '').slice(0, MAX_PHONE_DIGITS);
  if (!digitsOnly) {
    return '';
  }

  return `+${digitsOnly}`;
}

export function phoneDigitsCount(value) {
  return String(value ?? '').replace(/\D/g, '').length;
}

/**
 * Форматирование при вводе: автоматически «+» и разделители по стране (libphonenumber-js AsYouType).
 */
export function formatPhoneMask(value) {
  const international = toInternationalInput(value);
  if (!international) {
    return '';
  }

  return new AsYouType().input(international);
}

export function normalizePhoneStorage(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    return '';
  }

  const parsed = parsePhoneNumberFromString(trimmed);
  if (!parsed || !parsed.isValid()) {
    return '';
  }

  return parsed.format('E.164');
}

export function validatePhoneClient(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    return true;
  }

  const parsed = parsePhoneNumberFromString(trimmed);
  return !!parsed?.isValid();
}

export function phoneValidationMessage() {
  return 'Укажите полный международный номер (до 15 цифр), например +7 900 123 45 67';
}

export function phoneInputHint() {
  return 'Международный формат, до 15 цифр. Пример: +7 (900) 123-45-67';
}

export function normalizeWebsiteUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return '';
  }

  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(raw)) {
    return raw;
  }

  return `https://${raw}`;
}

export function validateWebsiteClient(value) {
  if (!value || !String(value).trim()) {
    return true;
  }

  try {
    const url = new URL(normalizeWebsiteUrl(value));
    return ['http:', 'https:'].includes(url.protocol) && !!url.hostname && url.hostname.includes('.');
  } catch {
    return false;
  }
}

export function websiteValidationMessage() {
  return 'Укажите корректный адрес сайта (например, google.com или https://example.com)';
}
