import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const FEED_DEFAULT_SORT_BY = 'created_at';
export const FEED_DEFAULT_SORT_DIR = 'desc';
export const FEED_DEFAULT_PER_PAGE = 25;

const defaultState = {
  searchInput: '',
  searchQuery: '',
  tagFilterInput: '',
  tagFilter: '',
  categoryFilter: '',
  sortBy: FEED_DEFAULT_SORT_BY,
  sortDir: FEED_DEFAULT_SORT_DIR,
  perPage: FEED_DEFAULT_PER_PAGE,
  currentPage: 1,
  filtersPanelOpen: false,
  followingOnly: false,
};

const FeedFiltersContext = createContext(null);

export function useFeedFilters() {
  const ctx = useContext(FeedFiltersContext);
  if (!ctx) {
    throw new Error('useFeedFilters must be used within FeedFiltersProvider');
  }
  return ctx;
}

export function FeedFiltersProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [searchInput, setSearchInput] = useState(defaultState.searchInput);
  const [searchQuery, setSearchQuery] = useState(defaultState.searchQuery);
  const [tagFilterInput, setTagFilterInput] = useState(defaultState.tagFilterInput);
  const [tagFilter, setTagFilter] = useState(defaultState.tagFilter);
  const [categoryFilter, setCategoryFilter] = useState(defaultState.categoryFilter);
  const [sortBy, setSortBy] = useState(defaultState.sortBy);
  const [sortDir, setSortDir] = useState(defaultState.sortDir);
  const [perPage, setPerPage] = useState(defaultState.perPage);
  const [currentPage, setCurrentPage] = useState(defaultState.currentPage);
  const [filtersPanelOpen, setFiltersPanelOpen] = useState(defaultState.filtersPanelOpen);
  const [followingOnly, setFollowingOnly] = useState(defaultState.followingOnly);

  const scrollRestoreRef = useRef(null);

  const saveScrollPosition = useCallback((y = window.scrollY) => {
    scrollRestoreRef.current = y;
  }, []);

  const consumeScrollRestore = useCallback(() => {
    const y = scrollRestoreRef.current;
    scrollRestoreRef.current = null;
    return typeof y === 'number' && y > 0 ? y : null;
  }, []);

  const resetAllFilters = useCallback(() => {
    setSearchInput(defaultState.searchInput);
    setSearchQuery(defaultState.searchQuery);
    setTagFilterInput(defaultState.tagFilterInput);
    setTagFilter(defaultState.tagFilter);
    setCategoryFilter(defaultState.categoryFilter);
    setSortBy(defaultState.sortBy);
    setSortDir(defaultState.sortDir);
    setPerPage(defaultState.perPage);
    setCurrentPage(defaultState.currentPage);
    setFiltersPanelOpen(defaultState.filtersPanelOpen);
    setFollowingOnly(defaultState.followingOnly);
    scrollRestoreRef.current = null;
    if (location.pathname === '/') {
      navigate({ pathname: '/', search: '' }, { replace: true });
    }
  }, [location.pathname, navigate]);

  const value = useMemo(
    () => ({
      searchInput,
      setSearchInput,
      searchQuery,
      setSearchQuery,
      tagFilterInput,
      setTagFilterInput,
      tagFilter,
      setTagFilter,
      categoryFilter,
      setCategoryFilter,
      sortBy,
      setSortBy,
      sortDir,
      setSortDir,
      perPage,
      setPerPage,
      currentPage,
      setCurrentPage,
      filtersPanelOpen,
      setFiltersPanelOpen,
      followingOnly,
      setFollowingOnly,
      saveScrollPosition,
      consumeScrollRestore,
      resetAllFilters,
    }),
    [
      searchInput,
      searchQuery,
      tagFilterInput,
      tagFilter,
      categoryFilter,
      sortBy,
      sortDir,
      perPage,
      currentPage,
      filtersPanelOpen,
      followingOnly,
      saveScrollPosition,
      consumeScrollRestore,
      resetAllFilters,
    ]
  );

  return (
    <FeedFiltersContext.Provider value={value}>
      {children}
    </FeedFiltersContext.Provider>
  );
}
