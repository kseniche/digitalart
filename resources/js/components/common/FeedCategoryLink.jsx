import React from 'react';
import { useLocation } from 'react-router-dom';
import { useFeedFilters } from '../../contexts/FeedFiltersContext';
import { useFeedNavigation } from '../../hooks/useFeedNavigation';

function FeedCategoryLink({ categoryId, categoryName, className = '', active = false, prefix = '' }) {
  const location = useLocation();
  const { categoryFilter, setCategoryFilter, setCurrentPage } = useFeedFilters();
  const { goToFeedWithCategory } = useFeedNavigation();
  const name = String(categoryName ?? '').trim();
  if (!name) {
    return null;
  }
  const isActive = active || (categoryId != null && String(categoryFilter) === String(categoryId));

  const handleClick = (e) => {
    if (isActive && location.pathname === '/') {
      e.preventDefault();
      e.stopPropagation();
      setCategoryFilter('');
      setCurrentPage(1);
      return;
    }
    goToFeedWithCategory({ id: categoryId, name }, e);
  };

  return (
    <button
      type="button"
      className={`feed-nav-chip feed-nav-chip--category${isActive ? ' is-active' : ''}${className ? ` ${className}` : ''}`}
      onClick={handleClick}
      aria-pressed={isActive}
      title={isActive && location.pathname === '/' ? `Сбросить категорию «${name}»` : `Публикации в категории «${name}»`}
    >
      {prefix}
      {name}
    </button>
  );
}

export default FeedCategoryLink;
