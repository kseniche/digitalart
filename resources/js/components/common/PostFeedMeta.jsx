import React from 'react';
import FeedTagLink from './FeedTagLink';
import FeedCategoryLink from './FeedCategoryLink';
import { normalizeTagsList } from '../../utils/feedUrl';

/**
 * Теги и категория на карточках публикаций (кликабельная навигация в ленту).
 */
function PostFeedMeta({ tags, categoryId, categoryName, className = '', maxTags = 5 }) {
  const tagList = normalizeTagsList(tags);
  const visibleTags = maxTags > 0 ? tagList.slice(0, maxTags) : tagList;
  const hasCategory = Boolean(categoryName);
  if (!hasCategory && visibleTags.length === 0) {
    return null;
  }

  return (
    <div className={`post-feed-meta${className ? ` ${className}` : ''}`}>
      {hasCategory && (
        <FeedCategoryLink
          categoryId={categoryId}
          categoryName={categoryName}
          className="post-feed-meta__category"
        />
      )}
      {visibleTags.length > 0 && (
        <div className="post-feed-meta__tags" role="list">
          {visibleTags.map((tag, index) => (
            <FeedTagLink key={`${tag}-${index}`} tag={tag} className="post-feed-meta__tag" />
          ))}
          {tagList.length > visibleTags.length && (
            <span className="post-feed-meta__more" title={tagList.slice(maxTags).join(', ')}>
              +{tagList.length - visibleTags.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default PostFeedMeta;
