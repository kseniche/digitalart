import React, { useState, useEffect } from 'react';
import { apiFetchLocal as apiFetch } from '../../api';
import { useToast } from '../../contexts/ToastContext';
import EmptyState from '../common/EmptyState';
import MediaPreview from '../common/MediaPreview';

function UserDetail({ user, onBack, onUserAction, onShowUserPosts }) {
  const { toast } = useToast();
  const [userPosts, setUserPosts] = useState([]);
  const [userComments, setUserComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const userRoles = user.roles?.map((role) => role.name) || [];
  const [roleValue, setRoleValue] = useState(userRoles.includes('admin') ? 'admin' : 'user');
  const [roleSaving, setRoleSaving] = useState(false);

  useEffect(() => {
    fetchUserDetails();
  }, [user.id]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      // Загружаем детальную информацию о пользователе
      const response = await apiFetch(`/api/admin/users/${user.id}`, {
        headers: {
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
  const isBanned = !!user.is_banned;
  const isAdminUser = userRoles.includes('admin');

  const handleRoleSave = async () => {
    setRoleSaving(true);
    try {
      const res = await apiFetch(`/api/admin/users/${user.id}/role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ role: roleValue }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(data.message || 'Роль обновлена');
      } else {
        toast.error(data.message || 'Не удалось изменить роль');
      }
    } catch {
      toast.error('Ошибка соединения');
    } finally {
      setRoleSaving(false);
    }
  };

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
              {!isDeleted && isBanned && <div className="deleted-badge deleted-badge--banned">Бан</div>}
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
                {!isDeleted && isBanned && user.ban_reason && (
                  <div className="meta-item">
                    <span className="meta-label">Причина блокировки:</span>
                    <span className="meta-value">{user.ban_reason}</span>
                  </div>
                )}
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

          {!isDeleted && (
            <div className="user-actions">
              <h3>Роль на сайте</h3>
              <div className="action-buttons" style={{ marginBottom: '1rem' }}>
                <select
                  className="form-input"
                  value={roleValue}
                  onChange={(e) => setRoleValue(e.target.value)}
                  disabled={roleSaving}
                  aria-label="Роль пользователя"
                >
                  <option value="user">Пользователь</option>
                  <option value="admin">Администратор</option>
                </select>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleRoleSave}
                  disabled={roleSaving}
                >
                  {roleSaving ? 'Сохранение…' : 'Сохранить роль'}
                </button>
              </div>
            </div>
          )}

          {!isAdminUser && (
            <div className="user-actions">
              <h3>Действия</h3>
              <div className="action-buttons">
                {isDeleted ? (
                  <button
                    className="btn btn-primary"
                    onClick={() => onUserAction('restore', user.id)}
                  >
                    Восстановить пользователя
                  </button>
                ) : (
                  <>
                    {isBanned ? (
                      <button
                        className="btn btn-primary"
                        onClick={() => onUserAction('unban', user.id)}
                      >
                        Разблокировать
                      </button>
                    ) : (
                      <button
                        className="btn btn-outline"
                        onClick={() => onUserAction('ban', user.id)}
                      >
                        Заблокировать
                      </button>
                    )}
                    <button
                      className="btn btn-danger"
                      onClick={() => onUserAction('delete', user.id)}
                    >
                      Удалить пользователя
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="user-detail__sidebar">
          <div className="user-posts">
            <h3>Публикации ({userPosts.length})</h3>
            {loading ? (
              <EmptyState title="Загрузка публикаций" />
            ) : userPosts.length > 0 ? (
              <div className="posts-list">
                {userPosts.slice(0, 1).map(post => (
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
                      <MediaPreview
                        src={post.image_url}
                        mediaType={post.media_type}
                        alt={post.post_title}
                        className="post-thumbnail"
                      />
                    )}
                  </div>
                ))}
                <button
                  className="btn btn-outline"
                  onClick={() => onShowUserPosts?.(user)}
                >
                  Посмотреть публикации пользователя
                </button>
              </div>
            ) : (
              <EmptyState
                title="Нет публикаций"
                text="У пользователя пока нет работ для отображения."
                actions={<button className="admin-btn admin-btn-outline admin-btn-sm" onClick={onBack}>К списку пользователей</button>}
              />
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default UserDetail;