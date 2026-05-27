import React from 'react';

function CommentCard({ comment, onAction }) {
  const isDeleted = comment.deleted_at !== null;
  const isApproved = comment.moderation_status === 'approved';
  const isPending = comment.moderation_status === 'pending';
  const autoModerationPassed = comment.auto_moderation_passed !== false;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateText = (text, maxLength = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className={`admin-comment-card ${isDeleted ? 'admin-comment-card--deleted' : ''}`}>
      <div className="admin-comment-card__header">
        <div className="admin-comment-card__author">
          <img
            src={comment.author?.avatar_url || '/default-avatar.svg'}
            alt={comment.author?.name}
            className="author-avatar"
          />
          <div className="author-info">
            <h4 className="author-name">
              {comment.author?.name} {comment.author?.user_surname}
            </h4>
            <p className="admin-comment-date">{formatDate(comment.created_at)}</p>
          </div>
        </div>
        <div className="admin-status-row" style={{ alignItems: 'center' }}>
          {comment.author_deleted && <span className="admin-status-badge admin-status-badge--rejected">Автор удален</span>}
          {isPending && <span className="admin-status-badge admin-status-badge--pending">На модерации</span>}
          {isApproved && <span className="admin-status-badge admin-status-badge--approved">Одобрен</span>}
          {autoModerationPassed ? (
            <span className="admin-status-badge admin-status-badge--approved">Авто: пройдено</span>
          ) : (
            <span className="admin-status-badge admin-status-badge--rejected">Авто: не пройдено</span>
          )}
          {isDeleted && <div className="deleted-badge">Удален</div>}
        </div>
      </div>

      <div className="admin-comment-card__content">
        <p className="admin-comment-text">
          {truncateText(comment.comment_content)}
        </p>
        {!autoModerationPassed && comment.auto_moderation_reason && (
          <p className="admin-post-preview" style={{ marginTop: '0.5rem' }}>
            Причина автомодерации: {comment.auto_moderation_reason}
          </p>
        )}
      </div>

      {comment.post && (
        <div className="admin-comment-card__post">
          <div className="admin-post-reference">
            <h5 className="admin-comment-post-title">К публикации: {comment.post.post_title}</h5>
            <p className="admin-post-preview">
              {truncateText(comment.post.post_content || '', 100)}
            </p>
            {comment.post.image_url && (
              <img
                src={comment.post.image_url}
                alt={comment.post.post_title}
                className="admin-comment-post-thumbnail"
              />
            )}
          </div>
        </div>
      )}

      <div className="admin-comment-card__actions">
        {!isDeleted && !isApproved && (
          <button
            className="admin-btn admin-btn-success admin-btn-sm"
            onClick={() => onAction('approve', comment.id)}
          >
            Одобрить
          </button>
        )}
        <button
          className="admin-btn admin-btn-danger admin-btn-sm"
          onClick={() => onAction('delete', comment.id)}
        >
          Удалить
        </button>
      </div>
    </div>
  );
}

export default CommentCard;


