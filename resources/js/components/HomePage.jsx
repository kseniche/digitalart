import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  useFeedFilters,
  FEED_DEFAULT_SORT_BY,
  FEED_DEFAULT_SORT_DIR,
} from '../contexts/FeedFiltersContext';
import { useToast } from '../contexts/ToastContext';
import { apiFetch } from '../api';
import EmptyState from './common/EmptyState';
import Alert from './common/Alert';
import FeedPostCard from './FeedPostCard';
import MasonryGrid from './common/MasonryGrid';
import '../../css/app.css';

const SORT_BY_OPTIONS = [
  { value: 'created_at', label: 'Дата' },
  { value: 'like_count', label: 'Популярность' },
  { value: 'post_title', label: 'Название' },
];
const PER_PAGE_OPTIONS = [10, 25, 50];
const SEARCH_DEBOUNCE_MS = 450;
const TAG_FILTER_DEBOUNCE_MS = 450;

function HomePage() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const {
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
  } = useFeedFilters();

  const showGuestLogin = useCallback(() => setShowLoginModal(true), []);
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isFeedLoading, setIsFeedLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [lastPage, setLastPage] = useState(1);
  const [error, setError] = useState('');
  const [feedTotal, setFeedTotal] = useState(0);
  const [followingSubscriptionsCount, setFollowingSubscriptionsCount] = useState(null);
  const feedRequestIdRef = useRef(0);
  const filtersMountedRef = useRef(false);
  const scrollRestoredRef = useRef(false);

  const formatPost = (post) => ({
    id: post.id,
    title: post.post_title,
    author: {
      id: post.author?.id,
      name: post.author ? `${post.author.name} ${post.author.user_surname || ''}`.trim() : 'Неизвестный автор',
      avatar: post.author?.avatar_url || post.author?.avatar || '/default-avatar.svg',
    },
    image: post.image_url || '/images/digital-art-1.jpg',
    mediaType: post.media_type || 'image',
    description: post.post_content || '',
    tags: post.tags ? (Array.isArray(post.tags) ? post.tags : post.tags.split(',').map((tag) => tag.trim())) : [],
    likes: post.like_count || 0,
    isLiked: !!post.liked,
    comments: post.comment_count || 0,
    createdAt: post.created_at || '',
    category: post.category || null,
  });

  const buildFeedParams = useCallback((page) => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('per_page', String(perPage));
    params.set('sort_by', sortBy);
    params.set('sort_dir', sortDir);
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (tagFilter.trim()) params.set('tag', tagFilter.trim());
    if (categoryFilter) {
      params.set('category', categoryFilter);
      params.set('category_id', categoryFilter);
    }
    if (followingOnly) {
      params.set('following', 'true');
    }
    return params.toString();
  }, [sortBy, sortDir, searchQuery, tagFilter, categoryFilter, perPage, followingOnly]);

  const loadPosts = useCallback(async (page = 1) => {
    const requestId = ++feedRequestIdRef.current;
    setIsFeedLoading(true);
    scrollRestoredRef.current = false;
    try {
      const query = buildFeedParams(page);
      const response = await apiFetch(`/api/feed?${query}`);

      if (requestId !== feedRequestIdRef.current) {
        return;
      }

      if (response.ok) {
        const data = await response.json();
        const rows = Array.isArray(data?.data)
          ? data.data
          : (Array.isArray(data) ? data : []);
        setPosts(rows.map(formatPost));
        setFeedTotal(typeof data.total === 'number' ? data.total : rows.length);
        setCurrentPage(typeof data.current_page === 'number' ? data.current_page : page);
        setLastPage(typeof data.last_page === 'number' ? data.last_page : 1);
        setFollowingSubscriptionsCount(
          followingOnly && typeof data.following_subscriptions_count === 'number'
            ? data.following_subscriptions_count
            : null
        );
        setError('');
      } else {
        setPosts([]);
        setFeedTotal(0);
        setCurrentPage(1);
        setLastPage(1);
        setFollowingSubscriptionsCount(null);
        const msg = 'Не удалось загрузить публикации. Попробуйте позже.';
        setError(msg);
        toast.error(msg);
      }
    } catch {
      if (requestId !== feedRequestIdRef.current) {
        return;
      }
      setPosts([]);
      setFeedTotal(0);
      setCurrentPage(1);
      setLastPage(1);
      setFollowingSubscriptionsCount(null);
      const msg = 'Ошибка соединения с сервером';
      setError(msg);
      toast.error(msg);
    } finally {
      if (requestId === feedRequestIdRef.current) {
        setIsFeedLoading(false);
      }
    }
  }, [buildFeedParams, toast, setCurrentPage, followingOnly]);

  useEffect(() => {
    if (!isAuthenticated && followingOnly) {
      setFollowingOnly(false);
    }
  }, [isAuthenticated, followingOnly, setFollowingOnly]);

  useEffect(() => {
    apiFetch('/api/categories')
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setCategories(Array.isArray(list) ? list : []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput, setSearchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTagFilter(tagFilterInput.trim());
    }, TAG_FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [tagFilterInput, setTagFilter]);

  const filterSignature = useMemo(
    () => JSON.stringify({ searchQuery, tagFilter, categoryFilter, sortBy, sortDir, perPage, followingOnly }),
    [searchQuery, tagFilter, categoryFilter, sortBy, sortDir, perPage, followingOnly]
  );

  useEffect(() => {
    loadPosts(currentPage);
  }, [currentPage, filterSignature, loadPosts]);

  useEffect(() => {
    if (!filtersMountedRef.current) {
      filtersMountedRef.current = true;
      return;
    }
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      loadPosts(1);
    }
  }, [filterSignature, setCurrentPage, currentPage, loadPosts]);

  useEffect(() => {
    return () => {
      saveScrollPosition(window.scrollY);
      filtersMountedRef.current = false;
    };
  }, [saveScrollPosition]);

  useEffect(() => {
    if (isFeedLoading || scrollRestoredRef.current) {
      return;
    }
    const y = consumeScrollRestore();
    if (y == null) {
      return;
    }
    scrollRestoredRef.current = true;
    requestAnimationFrame(() => {
      window.scrollTo({ top: y, behavior: 'auto' });
    });
  }, [isFeedLoading, posts.length, consumeScrollRestore]);

  const goToPage = (page) => {
    if (page < 1 || page > lastPage || page === currentPage || isFeedLoading) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pageNumbers = useMemo(() => {
    if (lastPage <= 1) return [];
    if (lastPage <= 7) {
      return Array.from({ length: lastPage }, (_, i) => i + 1);
    }
    const pages = new Set([1, lastPage, currentPage, currentPage - 1, currentPage + 1]);
    const sorted = [...pages].filter((p) => p >= 1 && p <= lastPage).sort((a, b) => a - b);
    const result = [];
    sorted.forEach((p, i) => {
      if (i > 0 && p - sorted[i - 1] > 1) result.push('…');
      result.push(p);
    });
    return result;
  }, [currentPage, lastPage]);

  const displayPosts = posts;
  const hasActiveFilters =
    searchInput.trim() !== '' ||
    tagFilterInput.trim() !== '' ||
    categoryFilter !== '' ||
    sortBy !== FEED_DEFAULT_SORT_BY ||
    sortDir !== FEED_DEFAULT_SORT_DIR ||
    followingOnly;

  const emptyFollowingState = useMemo(() => {
    if (!followingOnly || isFeedLoading || error) return null;
    if (followingSubscriptionsCount === null) return null;
    if (followingSubscriptionsCount === 0) {
      return {
        title: 'Подписки пока отсутствуют',
        text: 'У вас пока нет подписок. Подпишитесь на авторов, чтобы видеть их публикации в отдельной ленте.',
      };
    }
    if (displayPosts.length === 0 && feedTotal === 0) {
      return {
        title: 'Публикаций от подписок нет',
        text: 'У авторов, на которых вы подписаны, пока нет опубликованных работ.',
      };
    }
    return null;
  }, [followingOnly, isFeedLoading, followingSubscriptionsCount, displayPosts.length, feedTotal, error]);

  return (
    <div className="main-content">
      <div className="search-section">
        <div className="homepage-toolbar">
          <div className="search-bar">
            <input
              type="text"
              className="search-input"
              placeholder="Поиск по названию, содержимому, тегам..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <button
            type="button"
            className={`homepage-filters-toggle-btn${hasActiveFilters ? ' is-active' : ''}`}
            aria-expanded={filtersPanelOpen}
            aria-label={filtersPanelOpen ? 'Скрыть фильтры' : 'Показать фильтры'}
            title={filtersPanelOpen ? 'Скрыть фильтры' : 'Фильтры'}
            onClick={() => setFiltersPanelOpen((prev) => !prev)}
          >
            <svg
              className="homepage-filters-toggle-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M4 6h16" />
              <path d="M7 12h10" />
              <path d="M10 18h4" />
            </svg>
          </button>
        </div>
        <div className={`homepage-filters-panel${filtersPanelOpen ? ' is-open' : ''}`}>
          <div className="homepage-filters-grid">
            <div className="homepage-filter-block homepage-filter-block--tag">
              <input
                type="text"
                className="homepage-tag-search-input"
                placeholder="Поиск по тегам..."
                value={tagFilterInput}
                onChange={(e) => setTagFilterInput(e.target.value)}
                aria-label="Поиск по тегам"
                autoComplete="off"
                spellCheck={false}
                inputMode="search"
              />
            </div>
            {isAuthenticated && (
              <div className="homepage-filter-block homepage-filter-block--following">
                <label
                  className="homepage-following-toggle"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '0.875rem',
                    color: '#111827',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={followingOnly}
                    onChange={(e) => setFollowingOnly(e.target.checked)}
                    style={{ accentColor: '#7B0000' }}
                  />
                  Только публикации авторов, на которых я подписан
                </label>
              </div>
            )}
            <div className="homepage-filter-block">
              <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.875rem', color: '#111827' }}>Категория:</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #D4D1CC',
                  fontFamily: 'JetBrains Mono, monospace',
                  minWidth: '140px',
                }}
              >
                <option value="">Все категории</option>
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="homepage-filter-block">
              <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.875rem', color: '#111827' }}>Сортировка:</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #D4D1CC',
                    fontFamily: 'JetBrains Mono, monospace',
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {SORT_BY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="homepage-sort-dir-btn"
                  onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                  title={sortDir === 'asc' ? 'По возрастанию (клик — по убыванию)' : 'По убыванию (клик — по возрастанию)'}
                >
                  {sortDir === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
            <div className="homepage-filter-block">
              <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.875rem', color: '#111827' }}>На странице:</label>
              <select
                value={perPage}
                onChange={(e) => setPerPage(Number(e.target.value))}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #D4D1CC',
                  fontFamily: 'JetBrains Mono, monospace',
                  minWidth: '80px',
                }}
                aria-label="Количество публикаций на странице"
              >
                {PER_PAGE_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div className="homepage-filter-block homepage-filter-block--reset">
              <label
                style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.875rem', color: '#111827' }}
                aria-hidden="true"
              >
                {'\u00a0'}
              </label>
              <div className="homepage-filter-reset-row">
                <button
                  type="button"
                  className="homepage-per-page-btn"
                  onClick={resetAllFilters}
                  disabled={!hasActiveFilters}
                  title="Сбросить все фильтры"
                >
                  Сброс
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} className="home-alert" />

      {!isFeedLoading && displayPosts.length > 0 && (
        <p
          className="homepage-feed-meta"
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.875rem',
            color: '#6b7280',
            margin: '0 0 1rem 0',
          }}
        >
          Показано {displayPosts.length} из {feedTotal} · страница {currentPage} из {lastPage}
        </p>
      )}

      {isFeedLoading && displayPosts.length === 0 && (
        <p className="homepage-feed-loading" style={{ textAlign: 'center', padding: '2rem 0', color: '#6b7280' }}>
          Загрузка...
        </p>
      )}
      {displayPosts.length > 0 && (
        <MasonryGrid loading={isFeedLoading} aria-busy={isFeedLoading}>
          {displayPosts.map((post) => (
            <FeedPostCard
              key={post.id}
              post={post}
              isAuthenticated={isAuthenticated}
              onGuestClick={showGuestLogin}
            />
          ))}
        </MasonryGrid>
      )}

      {lastPage > 1 && (
        <nav className="pagination homepage-pagination" aria-label="Навигация по страницам">
          <button
            type="button"
            className="btn btn-outline"
            disabled={currentPage <= 1 || isFeedLoading}
            onClick={() => goToPage(currentPage - 1)}
          >
            ← Предыдущая
          </button>
          <div className="homepage-pagination-pages">
            {pageNumbers.map((p, idx) => (
              typeof p === 'number' ? (
                <button
                  key={`page-${p}`}
                  type="button"
                  className={`btn btn-outline homepage-pagination-page${p === currentPage ? ' is-active' : ''}`}
                  disabled={isFeedLoading}
                  aria-current={p === currentPage ? 'page' : undefined}
                  onClick={() => goToPage(p)}
                >
                  {p}
                </button>
              ) : (
                <span key={`ellipsis-${idx}`} className="pagination-info">…</span>
              )
            ))}
          </div>
          <button
            type="button"
            className="btn btn-outline"
            disabled={currentPage >= lastPage || isFeedLoading}
            onClick={() => goToPage(currentPage + 1)}
          >
            Следующая →
          </button>
        </nav>
      )}

      {displayPosts.length === 0 && !isFeedLoading && (
        <EmptyState
          title={emptyFollowingState?.title ?? 'Работы не найдены'}
          text={emptyFollowingState?.text ?? 'Попробуйте изменить поисковый запрос или фильтры. В ленте только одобренные опубликованные работы.'}
          actions={
            <>
              <button type="button" className="btn btn-outline" onClick={resetAllFilters}>Сбросить фильтры</button>
              {!emptyFollowingState && isAuthenticated && (
                <Link to="/create" className="btn btn-primary">Создать публикацию</Link>
              )}
            </>
          }
        />
      )}

      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowLoginModal(false)}>×</button>
            <h2 style={{ marginBottom: '1.5rem', textAlign: 'center', color: '#1f2937' }}>Ошибка</h2>
            <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '2rem' }}>
              Для выполнения этого действия необходимо войти в систему
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setShowLoginModal(false)}>Понятно</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;
