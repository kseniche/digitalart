import React from 'react';

function PostCard({ post, onAction }) {
  const isDeleted = post.deleted_at !== null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
            <p className="admin-post-date">{formatDate(post.created_at)}</p>
          </div>
        </div>
        {isDeleted && <div className="deleted-badge">Удалена</div>}
      </div>

      {post.image_url && (
        <div className="admin-post-image">
          <img
            src={post.image_url}
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

        {tags.length > 0 && (
          <div className="admin-post-tags">
            {tags.map((tag, index) => (
              <span key={index} className="admin-tag">
                #{tag}
              </span>
            ))}
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
        {isDeleted ? (
          <button
            className="admin-btn admin-btn-success admin-btn-sm"
            onClick={() => onAction('restore', post.id)}
          >
            Восстановить
          </button>
        ) : (
          <button
            className="admin-btn admin-btn-danger admin-btn-sm"
            onClick={() => onAction('delete', post.id)}
          >
            Удалить
          </button>
        )}
      </div>
    </div>
  );
}

export default PostCard;