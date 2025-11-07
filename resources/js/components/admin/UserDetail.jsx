import React, { useState, useEffect } from 'react';

function UserDetail({ user, onBack, onUserAction }) {
  const [userPosts, setUserPosts] = useState([]);
  const [userComments, setUserComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserDetails();
  }, [user.id]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      // Загружаем детальную информацию о пользователе
      const response = await fetch(`/api/admin/users/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUserPosts(userData.posts || []);
        setUserComments(userData.comments || []);
      }
    } catch (error) {
      console.error('Ошибка при загрузке деталей пользователя:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isDeleted = user.deleted_at !== null;
  const userRoles = user.roles?.map(role => role.name) || [];

  return (
    <div className="user-detail">
      <div className="user-detail__header">
        <button className="btn btn-outline" onClick={onBack}>
          ← Назад к списку
        </button>
        <h2>Детали пользователя</h2>
      </div>

      <div className="user-detail__content">
        <div className="user-detail__main">
          {/* Информация о пользователе - сверху */}
          <div className="user-info">
            <div className="user-info__avatar">
              <img
                src={user.avatar_url || '/default-avatar.svg'}
                alt={user.name}
                className="avatar-large"
              />
              {isDeleted && <div className="deleted-badge">Удален</div>}
            </div>
            
            <div className="user-info__details">
              <h1 className="user-name">
                {user.name} {user.user_surname}
              </h1>
              <p className="user-email">{user.email}</p>
              {user.username && (
                <p className="user-username">@{user.username}</p>
              )}
              
              {/* Основная информация */}
              <div className="user-meta">
                <div className="meta-item">
                  <span className="meta-label">Роли:</span>
                  <span className="meta-value">
                    {userRoles.length > 0 ? userRoles.join(', ') : 'Пользователь'}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Телефон:</span>
                  <span className="meta-value">{user.phone || 'Не указан'}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Страна:</span>
                  <span className="meta-value">{user.country || 'Не указана'}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Сайт:</span>
                  <span className="meta-value">
                    {user.website ? (
                      <a 
                        href={user.website.startsWith('http') ? user.website : `https://${user.website}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        {user.website}
                      </a>
                    ) : (
                      'Не указан'
                    )}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">О себе:</span>
                  <span className="meta-value">{user.bio || 'Нет описания'}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Регистрация:</span>
                  <span className="meta-value">{formatDate(user.created_at)}</span>
                </div>
                {isDeleted && (
                  <div className="meta-item">
                    <span className="meta-label">Удален:</span>
                    <span className="meta-value">{formatDate(user.deleted_at)}</span>
                  </div>
                )}
              </div>
              
              {/* Статистика */}
              <div className="profile-stats">
                <div className="stat">
                  <span className="stat-number">{user.followers_count || 0}</span>
                  <span className="stat-label">Подписчики</span>
                </div>
                <div className="stat">
                  <span className="stat-number">{user.following_count || 0}</span>
                  <span className="stat-label">Подписки</span>
                </div>
                <div className="stat">
                  <span className="stat-number">{user.posts_count || 0}</span>
                  <span className="stat-label">Публикации</span>
                </div>
              </div>
            </div>
          </div>

          <div className="user-actions">
            <h3>Действия</h3>
            <div className="action-buttons">
              {isDeleted ? (
                <button
                  className="btn btn-success"
                  onClick={() => onUserAction('restore', user.id)}
                >
                  Восстановить пользователя
                </button>
              ) : (
                <button
                  className="btn btn-danger"
                  onClick={() => onUserAction('delete', user.id)}
                  disabled={userRoles.includes('admin')}
                >
                  Удалить пользователя
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="user-detail__sidebar">
          <div className="user-posts">
            <h3>Публикации ({userPosts.length})</h3>
            {loading ? (
              <div className="loading">Загрузка...</div>
            ) : userPosts.length > 0 ? (
              <div className="posts-list">
                {userPosts.slice(0, 5).map(post => (
                  <div key={post.id} className="post-item">
                    <div className="post-content">
                      <h4 className="post-title">{post.post_title}</h4>
                      <p className="post-meta">
                        {formatDate(post.created_at)} • 
                        {post.deleted_at ? ' Удалена' : ' Активна'} •
                        Лайков: {post.likes_count || 0} • 
                        Комментариев: {post.comments_count || 0}
                      </p>
                    </div>
                    {post.image_url && (
                      <img
                        src={post.image_url}
                        alt={post.post_title}
                        className="post-thumbnail"
                      />
                    )}
                  </div>
                ))}
                {userPosts.length > 5 && (
                  <p className="more-posts">
                    И еще {userPosts.length - 5} публикаций...
                  </p>
                )}
              </div>
            ) : (
              <p className="empty-state">Нет публикаций</p>
            )}
          </div>

          <div className="user-comments">
            <h3>Комментарии ({userComments.length})</h3>
            {loading ? (
              <div className="loading">Загрузка...</div>
            ) : userComments.length > 0 ? (
              <div className="comments-list">
                {userComments.slice(0, 5).map(comment => (
                  <div key={comment.id} className="comment-item">
                    <p className="comment-content">
                      {comment.comment_content.length > 100 
                        ? comment.comment_content.substring(0, 100) + '...'
                        : comment.comment_content
                      }
                    </p>
                    <p className="comment-meta">
                      {formatDate(comment.created_at)} • 
                      {comment.deleted_at ? ' Удален' : ' Активен'}
                      {comment.post && ` • К: "${comment.post.post_title}"`}
                    </p>
                  </div>
                ))}
                {userComments.length > 5 && (
                  <p className="more-comments">
                    И еще {userComments.length - 5} комментариев...
                  </p>
                )}
              </div>
            ) : (
              <p className="empty-state">Нет комментариев</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserDetail;