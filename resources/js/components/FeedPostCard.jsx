import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import MediaPreview from './common/MediaPreview';
import { useMasonryRelayout } from './common/MasonryGrid';

function FeedPostCard({ post, isAuthenticated, onGuestClick }) {
  const scheduleRelayout = useMasonryRelayout();
  return (
    <article className="masonry-card">
      <div className="masonry-card__media">
        {isAuthenticated ? (
          <Link to={`/post/${post.id}`} className="masonry-card__media-link">
            <MediaPreview
              src={post.image}
              mediaType={post.mediaType}
              alt={post.title}
              className="masonry-card__image"
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
              onMediaLoad={scheduleRelayout}
            />
          </div>
        )}
      </div>

      <div className="card-info">
        <h3 className="card-title">
          {isAuthenticated ? (
            <Link to={`/post/${post.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
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
            <Link to={`/profile/${post.author.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <img
                  src={post.author.avatar}
                  alt={post.author.name}
                  className="author-avatar"
                  onError={(e) => {
                    e.target.src = '/default-avatar.svg';
                  }}
                />
                <span className="author-name">{post.author.name}</span>
              </div>
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
}

export default memo(FeedPostCard);
