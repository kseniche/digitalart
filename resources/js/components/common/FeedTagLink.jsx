import React from 'react';
import { useLocation } from 'react-router-dom';
import { useFeedFilters } from '../../contexts/FeedFiltersContext';
import { useFeedNavigation } from '../../hooks/useFeedNavigation';

function FeedTagLink({ tag, className = '', active = false, showHash = true }) {
  const location = useLocation();
  const { tagFilter, setTagFilter, setTagFilterInput, setCurrentPage } = useFeedFilters();
  const { goToFeedWithTag } = useFeedNavigation();
  const label = String(tag ?? '').trim().replace(/^#+/, '');
  if (!label) {
    return null;
  }
  const isActive = active || (tagFilter && tagFilter.toLowerCase() === label.toLowerCase());

  const handleClick = (e) => {
    if (isActive && location.pathname === '/') {
      e.preventDefault();
      e.stopPropagation();
      setTagFilterInput('');
      setTagFilter('');
      setCurrentPage(1);
      return;
    }
    goToFeedWithTag(label, e);
  };

  return (
    <button
      type="button"
      className={`feed-nav-chip feed-nav-chip--tag${isActive ? ' is-active' : ''}${className ? ` ${className}` : ''}`}
      onClick={handleClick}
      aria-pressed={isActive}
      title={isActive && location.pathname === '/' ? `Сбросить фильтр «${label}»` : `Публикации с тегом «${label}»`}
    >
      {showHash ? `#${label}` : label}
    </button>
  );
}

export default FeedTagLink;
