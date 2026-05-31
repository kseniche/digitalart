/**
 * Разбор ошибок валидации API (422) для форм.
 */

const API_FIELD_TO_FORM = {
  media_file: 'image',
  firstName: 'firstName',
  lastName: 'lastName',
  passwordConfirmation: 'passwordConfirmation',
  content: 'content',
  other_text: 'other_text',
};

export function humanizeValidationMessage(raw) {
  if (!raw || typeof raw !== 'string') {
    return 'Проверьте правильность заполнения формы';
  }
  const msg = raw.trim();

  if (/^validation\.[a-z0-9_.]+$/i.test(msg)) {
    return 'Проверьте правильность заполнения формы';
  }

  if (/^validation\.uploaded$/i.test(msg)) {
    return 'Файл загружен некорректно. Попробуйте загрузить файл ещё раз или уменьшите размер (до 50 МБ).';
  }

  return msg;
}

export function mapApiValidationErrors(apiErrors, fieldMap = API_FIELD_TO_FORM) {
  const mapped = {};
  if (!apiErrors || typeof apiErrors !== 'object') {
    return mapped;
  }
  Object.entries(apiErrors).forEach(([apiKey, value]) => {
    const formKey = fieldMap[apiKey] || apiKey;
    const first = Array.isArray(value) ? value[0] : value;
    mapped[formKey] = humanizeValidationMessage(first);
  });
  return mapped;
}

export function getApiErrorMessage(response, errorData, fallback = 'Не удалось выполнить запрос') {
  if (response?.status === 422) {
    return errorData?.message || 'Проверьте правильность заполнения формы';
  }
  if (response?.status === 413) {
    return 'Размер данных слишком большой. Уменьшите файл или текст описания.';
  }
  if (errorData?.message) {
    return humanizeValidationMessage(errorData.message);
  }
  return fallback;
}
