/** Синхронизировано с config/post_tags.php */
export const POST_TAG_MAX_COUNT = 20;
export const POST_TAG_MAX_LENGTH = 50;
export const POST_TAGS_INPUT_MAX = 500;

export function parseTagsInput(value) {
  if (!value || typeof value !== 'string') {
    return [];
  }
  return value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

export function validateTagsInput(value) {
  const errors = {};
  const raw = value ?? '';
  const charCount = raw.length;
  const tags = parseTagsInput(raw);

  if (charCount > POST_TAGS_INPUT_MAX) {
    errors.tags = `Строка тегов не должна превышать ${POST_TAGS_INPUT_MAX} символов (сейчас: ${charCount})`;
    return { isValid: false, errors, tagCount: tags.length, charCount };
  }

  if (tags.length > POST_TAG_MAX_COUNT) {
    errors.tags = `Не более ${POST_TAG_MAX_COUNT} тегов (сейчас: ${tags.length})`;
    return { isValid: false, errors, tagCount: tags.length, charCount };
  }

  for (const tag of tags) {
    if (tag.length > POST_TAG_MAX_LENGTH) {
      const preview = tag.length > 20 ? `${tag.slice(0, 20)}…` : tag;
      errors.tags = `Каждый тег — не более ${POST_TAG_MAX_LENGTH} символов («${preview}»)`;
      return { isValid: false, errors, tagCount: tags.length, charCount };
    }
  }

  return { isValid: true, errors, tagCount: tags.length, charCount };
}
