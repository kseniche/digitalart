/**
 * URL-параметры ленты: ?tag=…&category=…&q=…
 * category — slug имени или числовой id (совместимо с API category_id).
 */

export function categoryToSlug(name) {
  if (!name || typeof name !== 'string') {
    return '';
  }
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function resolveCategoryParam(param, categories) {
  const raw = String(param ?? '').trim();
  if (!raw) {
    return '';
  }
  if (/^\d+$/.test(raw)) {
    return raw;
  }
  const slug = raw.toLowerCase();
  const found = (categories || []).find((c) => categoryToSlug(c.name) === slug);
  return found ? String(found.id) : '';
}

export function getCategoryLabel(categoryFilter, categories) {
  if (!categoryFilter) {
    return '';
  }
  const cat = (categories || []).find((c) => String(c.id) === String(categoryFilter));
  return cat?.name || '';
}

/**
 * @param {{ tag?: string, q?: string, categoryId?: string|number, categoryName?: string }} filters
 * @returns {string} search string including "?" or ""
 */
export function buildFeedSearchString(filters = {}) {
  const params = new URLSearchParams();
  const tag = String(filters.tag ?? '').trim();
  const q = String(filters.q ?? '').trim();
  if (q) {
    params.set('q', q);
  }
  if (tag) {
    params.set('tag', tag);
  }
  const categoryId = filters.categoryId != null && filters.categoryId !== ''
    ? String(filters.categoryId)
    : '';
  const categoryName = filters.categoryName;
  if (categoryId) {
    if (categoryName) {
      const slug = categoryToSlug(categoryName);
      params.set('category', slug || categoryId);
    } else {
      params.set('category', categoryId);
    }
  } else if (categoryName) {
    const slug = categoryToSlug(categoryName);
    if (slug) {
      params.set('category', slug);
    }
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

export function parseFeedSearchParams(search, categories) {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const tag = (params.get('tag') ?? '').trim();
  const q = (params.get('q') ?? '').trim();
  const categoryParam = (params.get('category') ?? params.get('category_id') ?? '').trim();
  const categoryId = resolveCategoryParam(categoryParam, categories);

  return { tag, q, categoryId, categoryParam };
}

/**
 * ID категории из URL с запасным значением, пока список categories ещё не загружен.
 */
export function resolveCategoryIdFromUrl(search, categories, fallbackCategoryFilter = '') {
  const { categoryId, categoryParam } = parseFeedSearchParams(search, categories);
  if (categoryId) {
    return categoryId;
  }
  if (!categoryParam) {
    return '';
  }
  if (/^\d+$/.test(categoryParam)) {
    return categoryParam;
  }
  const fallback = String(fallbackCategoryFilter ?? '').trim();
  return fallback || '';
}

export function normalizeTagsList(tags) {
  if (!tags) {
    return [];
  }
  if (Array.isArray(tags)) {
    return tags.map((t) => String(t).trim()).filter(Boolean);
  }
  if (typeof tags === 'string') {
    const trimmed = tags.trim();
    if (!trimmed) {
      return [];
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return normalizeTagsList(parsed);
      }
    } catch {
      // CSV
    }
    return trimmed.split(',').map((t) => t.trim()).filter(Boolean);
  }
  return [];
}
