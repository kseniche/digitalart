import React, { memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getReturnState } from '../utils/navigation';
import MediaPreview from './common/MediaPreview';
import { useMasonryRelayout } from './common/MasonryGrid';

function FeedPostCard({ post, isAuthenticated, onGuestClick }) {
  const location = useLocation();
  const linkState = getReturnState(location);
  const profileLinkState = { from: `${location.pathname}${location.search}` || '/' };
  const scheduleRelayout = useMasonryRelayout();

  const card = (
    <article className="masonry-card profile-post-card">
      <div className="masonry-card__media profile-post-media">
        {isAuthenticated ? (
          <Link to={`/post/${post.id}`} state={linkState} className="masonry-card__media-link">
            <MediaPreview
              src={post.image}
              mediaType={post.mediaType}
              alt={post.title}
              className="masonry-card__image"
              interactionMode="card"
              controls={false}
              onMediaLoad={scheduleRelayout}
            />
          </Link>
        ) : (
          <div
            className="masonry-card__media-link"
            onClick={onGuestClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onGuestClick()}
          >
            <MediaPreview
              src={post.image}
              mediaType={post.mediaType}
              alt={post.title}
              className="masonry-card__image"
              interactionMode="card"
              controls={false}
              onMediaLoad={scheduleRelayout}
            />
          </div>
        )}
      </div>

      <div className="card-info">
        <h3 className="card-title">
          {isAuthenticated ? (
            <Link to={`/post/${post.id}`} state={linkState} style={{ textDecoration: 'none', color: 'inherit' }}>
              {post.title}
            </Link>
          ) : (
            <span onClick={onGuestClick} className="feed-guest-link">
              {post.title}
            </span>
          )}
        </h3>
        <div className="card-author">
          {isAuthenticated ? (
            <Link
              to={`/profile/${post.author.id}`}
              state={profileLinkState}
              className="feed-guest-link"
            >
              {post.author.name}
            </Link>
          ) : (
            <span onClick={onGuestClick} className="feed-guest-link">
              {post.author.name}
            </span>
          )}
        </div>
      </div>
    </article>
  );

  return (
    <div className="masonry-item feed-post-item">
      {card}
    </div>
  );
}

export default memo(FeedPostCard);
