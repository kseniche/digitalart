import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import MediaPreview from './common/MediaPreview';
import { useMasonryRelayout } from './common/MasonryGrid';

function MasonryRecommendationCard({ post, linkState }) {
  const scheduleRelayout = useMasonryRelayout();
  const authorName = post.author
    ? `${post.author.name || ''} ${post.author.user_surname || ''}`.trim() || 'Автор'
    : 'Автор';
  const authorAvatar = post.author?.avatar_url || post.author?.avatar || '/default-avatar.svg';
  const image = post.image_url || post.thumbnail_url || post.image || '/images/digital-art-1.jpg';
  const mediaType = post.media_type || post.mediaType || 'image';
  const title = post.post_title || post.title || '';

  return (
    <article className="masonry-card">
      <div className="masonry-card__media">
        <Link to={`/post/${post.id}`} state={linkState} className="masonry-card__media-link">
          <MediaPreview
            src={image}
            mediaType={mediaType}
            alt={title}
            className="masonry-card__image"
            onMediaLoad={scheduleRelayout}
          />
        </Link>
      </div>
      <div className="card-info">
        <h3 className="card-title">
          <Link to={`/post/${post.id}`} state={linkState} className="link-reset">
            {title}
          </Link>
        </h3>
        <div className="card-author">
          {post.author?.id ? (
            <Link to={`/profile/${post.author.id}`} className="link-reset">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <img
                  src={authorAvatar}
                  alt={authorName}
                  className="author-avatar"
                  onError={(e) => {
                    e.target.src = '/default-avatar.svg';
                  }}
                />
                <span className="author-name">{authorName}</span>
              </div>
            </Link>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <img src={authorAvatar} alt={authorName} className="author-avatar" />
              <span className="author-name">{authorName}</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default memo(MasonryRecommendationCard);
