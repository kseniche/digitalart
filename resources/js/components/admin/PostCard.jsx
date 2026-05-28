import React from 'react';
import MediaPreview from '../common/MediaPreview';

function PostCard({ post, onAction, showView = true }) {
  const isDeleted = post.deleted_at !== null;
  const isApproved = post.moderation_status === 'approved';
  const isPending = post.moderation_status === 'pending';
  const isRejected = post.moderation_status === 'rejected';
  const autoModerationPassed = post.auto_moderation_passed !== false;

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isScheduled = post.published_at && new Date(post.published_at) > new Date();
  const publicationLabel = post.is_draft
    ? 'Черновик'
    : isScheduled
      ? `Запланировано на ${formatDate(post.published_at)}`
      : post.published_at
        ? `Опубликован: ${formatDate(post.published_at)}`
        : null;

  const truncateText = (text, maxLength = 150) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // обрабатываем как строку и JSON
  const getTagsArray = () => {
    if (!post.tags) return [];
    
    try {
      // Если tags это JSON строка
      if (typeof post.tags === 'string') {
        const parsed = JSON.parse(post.tags);
        return Array.isArray(parsed) ? parsed : [];
      }
      // Если tags уже массив
      if (Array.isArray(post.tags)) {
        return post.tags;
      }
      return [];
    } catch (error) {
      // Если это простая строка с тегами через запятую
      if (typeof post.tags === 'string') {
        return post.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      }
      return [];
    }
  };

  const tags = getTagsArray();

  return (
    <div className={`admin-post-card ${isDeleted ? 'admin-post-card--deleted' : ''}`}>
      <div className="admin-post-card__header">
        <div className="admin-post-card__author">
          <img
            src={post.author?.avatar_url || '/default-avatar.svg'}
            alt={post.author?.name}
            className="author-avatar"
          />
          <div className="author-info">
            <h4 className="author-name">
              {post.author?.name} {post.author?.user_surname}
            </h4>
            <p className="admin-post-date">
              Создан: {formatDate(post.created_at)}
              {publicationLabel && (
                <span style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.85em', opacity: 0.9 }}>
                  {publicationLabel}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="admin-status-row">
          {post.author_deleted && <span className="admin-status-badge admin-status-badge--rejected">Автор удален</span>}
          {isPending && <span className="admin-status-badge admin-status-badge--pending">На модерации</span>}
          {post.moderation_overdue && (
            <span className="admin-status-badge admin-status-badge--rejected" title="Публикация ожидает проверки более 30 дней">
              Долгое ожидание модерации
            </span>
          )}
          {isApproved && <span className="admin-status-badge admin-status-badge--approved">Одобрено</span>}
          {isRejected && <span className="admin-status-badge admin-status-badge--rejected">Отклонено</span>}
          {autoModerationPassed ? (
            <span className="admin-status-badge admin-status-badge--approved">Авто: пройдено</span>
          ) : (
            <span className="admin-status-badge admin-status-badge--rejected">Авто: не пройдено</span>
          )}
          {isDeleted && <div className="deleted-badge">Удалена</div>}
        </div>
      </div>

      {post.image_url && (
        <div className="admin-post-image">
          <MediaPreview
            src={post.image_url}
            mediaType={post.media_type}
            alt={post.post_title}
            className="admin-post-thumbnail"
          />
        </div>
      )}

      <div className="admin-post-card__content">
        <h3 className="admin-post-title">{post.post_title}</h3>
        <p className="admin-post-content">
          {truncateText(post.post_content || '')}
        </p>
        {!autoModerationPassed && post.auto_moderation_reason && (
          <p className="admin-post-preview">Причина автомодерации: {truncateText(post.auto_moderation_reason, 180)}</p>
        )}

        {tags.length > 0 && (
          <div className="admin-post-tags">
            {tags.map((tag, index) => (
              <span key={index} className="admin-tag">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {post.category?.name && (
          <div className="admin-post-tags" style={{ marginTop: '0.75rem' }}>
            <span className="admin-tag">Категория: {post.category.name}</span>
          </div>
        )}
      </div>

      <div className="admin-post-card__stats">
        <div className="admin-stat">
          <span className="admin-stat-number">{post.likes_count || post.like_count || 0} лайков</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-number">{post.comments_count || 0} комментариев</span>
        </div>
      </div>

      <div className="admin-post-card__actions">
        {showView && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => onAction('view', post.id)}
          >
            Просмотреть
          </button>
        )}
        {!isDeleted && !isApproved && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => onAction('approve', post.id)}
          >
            Одобрить
          </button>
        )}
        {!isDeleted && (
          <>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => onAction('reject', post.id)}
            >
              Отклонить
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => onAction('delete', post.id)}
            >
              Удалить за нарушение
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default PostCard;