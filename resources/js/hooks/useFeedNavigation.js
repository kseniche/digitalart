import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFeedFilters } from '../contexts/FeedFiltersContext';
import { buildFeedSearchString } from '../utils/feedUrl';

/**
 * Переход на ленту с применением фильтра (без дублирования API-логики).
 */
export function useFeedNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    setTagFilterInput,
    setTagFilter,
    setCategoryFilter,
    setSearchInput,
    setSearchQuery,
    setCurrentPage,
  } = useFeedFilters();

  const goToFeedWithTag = useCallback(
    (rawTag, event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      const tag = String(rawTag ?? '').trim().replace(/^#+/, '');
      if (!tag) {
        return;
      }
      setSearchInput('');
      setSearchQuery('');
      setCategoryFilter('');
      setTagFilterInput(tag);
      setTagFilter(tag);
      setCurrentPage(1);
      const search = buildFeedSearchString({ tag });
      navigate({ pathname: '/', search }, { state: { from: `${location.pathname}${location.search}` } });
    },
    [
      navigate,
      location.pathname,
      location.search,
      setTagFilterInput,
      setTagFilter,
      setCategoryFilter,
      setSearchInput,
      setSearchQuery,
      setCurrentPage,
    ]
  );

  const goToFeedWithCategory = useCallback(
    ({ id, name }, event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      const categoryId = id != null && id !== '' ? String(id) : '';
      const categoryName = name || '';
      if (!categoryId && !categoryName) {
        return;
      }
      setSearchInput('');
      setSearchQuery('');
      setTagFilterInput('');
      setTagFilter('');
      if (categoryId) {
        setCategoryFilter(categoryId);
      }
      setCurrentPage(1);
      const search = buildFeedSearchString({
        categoryId: categoryId || undefined,
        categoryName: categoryName || undefined,
      });
      navigate({ pathname: '/', search }, { state: { from: `${location.pathname}${location.search}` } });
    },
    [
      navigate,
      location.pathname,
      location.search,
      setTagFilterInput,
      setTagFilter,
      setCategoryFilter,
      setSearchInput,
      setSearchQuery,
      setCurrentPage,
    ]
  );

  return { goToFeedWithTag, goToFeedWithCategory };
}
