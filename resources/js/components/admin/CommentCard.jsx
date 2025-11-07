import React from 'react';

function CommentCard({ comment, onAction }) {
  const isDeleted = comment.deleted_at !== null;

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
        {isDeleted && <div className="deleted-badge">Удален</div>}
      </div>

      <div className="admin-comment-card__content">
        <p className="admin-comment-text">
          {truncateText(comment.comment_content)}
        </p>
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
        {isDeleted ? (
          <button
            className="admin-btn admin-btn-success admin-btn-sm"
            onClick={() => onAction('restore', comment.id)}
          >
            Восстановить
          </button>
        ) : (
          <button
            className="admin-btn admin-btn-danger admin-btn-sm"
            onClick={() => onAction('delete', comment.id)}
          >
            Удалить
          </button>
        )}
      </div>
    </div>
  );
}

export default CommentCard;


