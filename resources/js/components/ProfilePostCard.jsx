import React, { memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getReturnState } from '../utils/navigation';
import MediaPreview from './common/MediaPreview';
import { useMasonryRelayout } from './common/MasonryGrid';

function ProfilePostCard({ post, profileTab, moderationFilter, onImageError, fallbackAuthor }) {
  const author = post.author || fallbackAuthor;
  const location = useLocation();
  const linkState = getReturnState(location);
  const scheduleRelayout = useMasonryRelayout();

  return (
    <Link to={`/post/${post.id}`} state={linkState} className="profile-post-link masonry-item">
      <article className="masonry-card profile-post-card">
        <div className="masonry-card__media profile-post-media">
          <MediaPreview
            src={post.image}
            mediaType={post.mediaType}
            alt={post.title}
            className="masonry-card__image"
            interactionMode="card"
            controls={false}
            onMediaLoad={scheduleRelayout}
            onImageError={onImageError}
          />
        </div>
        <div className="card-info">
          {profileTab === 'moderation' && (
            <div style={{ marginBottom: '0.4rem' }}>
              <span
                className={`admin-status-badge ${
                  moderationFilter === 'pending'
                    ? 'admin-status-badge--pending'
                    : 'admin-status-badge--rejected'
                }`}
              >
                {moderationFilter === 'pending' ? 'На модерации' : 'Отклонено'}
              </span>
            </div>
          )}
          <h3 className="card-title">{post.title}</h3>
          {author && profileTab !== 'moderation' && (
            <div className="card-author">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <img
                  src={author.avatar || '/default-avatar.svg'}
                  alt={author.name}
                  className="author-avatar"
                  onError={(e) => {
                    e.target.src = '/default-avatar.svg';
                  }}
                />
                <span className="author-name">{author.name}</span>
              </div>
            </div>
          )}
          {profileTab === 'moderation' && moderationFilter === 'rejected' && (
            <p className="profile-post-rejection">
              {(post.moderation_rejection_reason && String(post.moderation_rejection_reason).trim())
                || 'Нарушает правила сообщества.'}
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}

export default memo(ProfilePostCard);
