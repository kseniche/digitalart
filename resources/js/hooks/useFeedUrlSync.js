import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFeedFilters } from '../contexts/FeedFiltersContext';
import {
  buildFeedSearchString,
  getCategoryLabel,
  parseFeedSearchParams,
  resolveCategoryIdFromUrl,
} from '../utils/feedUrl';

/**
 * Двусторонняя синхронизация фильтров ленты и URL (только на главной `/`).
 * URL → state только при смене location.search.
 * state → URL когда пользователь меняет фильтры в UI (не перезатирать очистку из адреса).
 */
export function useFeedUrlSync(categories) {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    setSearchInput,
    setSearchQuery,
    setTagFilterInput,
    setTagFilter,
    categoryFilter,
    setCategoryFilter,
    tagFilter,
    searchQuery,
  } = useFeedFilters();

  const hydratingFromUrl = useRef(false);
  const urlHydrated = useRef(false);
  const lastAppliedSearch = useRef(null);

  useEffect(() => {
    if (location.pathname !== '/') {
      urlHydrated.current = false;
      lastAppliedSearch.current = null;
      return;
    }

    const search = location.search || '';
    const { tag, q } = parseFeedSearchParams(search, categories);
    const categoryId = resolveCategoryIdFromUrl(search, categories, categoryFilter);

    if (lastAppliedSearch.current === search) {
      const urlCategoryParam = (new URLSearchParams(
        search.startsWith('?') ? search.slice(1) : search
      ).get('category') ?? '').trim();

      // Список категорий подгрузился: slug в URL → id (только если в state ещё нет id)
      if (urlCategoryParam && categoryId && !categoryFilter) {
        hydratingFromUrl.current = true;
        setCategoryFilter(categoryId);
        urlHydrated.current = true;
        const t = requestAnimationFrame(() => {
          hydratingFromUrl.current = false;
        });
        return () => cancelAnimationFrame(t);
      }

      urlHydrated.current = true;
      return;
    }

    hydratingFromUrl.current = true;
    setTagFilterInput(tag);
    setTagFilter(tag);
    setSearchInput(q);
    setSearchQuery(q);
    setCategoryFilter(categoryId);
    lastAppliedSearch.current = search;
    urlHydrated.current = true;

    const t = requestAnimationFrame(() => {
      hydratingFromUrl.current = false;
    });
    return () => cancelAnimationFrame(t);
  }, [
    location.pathname,
    location.search,
    categories,
    setTagFilterInput,
    setTagFilter,
    setSearchInput,
    setSearchQuery,
    setCategoryFilter,
  ]);

  useEffect(() => {
    if (location.pathname !== '/') {
      return;
    }
    if (!urlHydrated.current || hydratingFromUrl.current) {
      return;
    }

    const urlParams = new URLSearchParams(location.search);
    const urlCategoryParam = (urlParams.get('category') ?? '').trim();

    if (urlCategoryParam && !categoryFilter && categories.length === 0) {
      return;
    }

    const categoryName = getCategoryLabel(categoryFilter, categories);
    const nextSearch = buildFeedSearchString({
      tag: tagFilter,
      q: searchQuery,
      categoryId: categoryFilter || undefined,
      categoryName: categoryName || undefined,
    });

    const normalizedCurrent = location.search || '';
    const normalizedNext = nextSearch || '';

    if (normalizedNext !== normalizedCurrent) {
      navigate({ pathname: '/', search: normalizedNext }, { replace: true });
    }
  }, [
    location.pathname,
    location.search,
    tagFilter,
    searchQuery,
    categoryFilter,
    categories,
    navigate,
  ]);
}
