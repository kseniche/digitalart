import React from 'react';

function UserCard({ user, onAction }) {
  const isDeleted = user.deleted_at !== null;
  const userRoles = user.roles?.map(role => role.name) || [];

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`user-card ${isDeleted ? 'user-card--deleted' : ''}`}>
      <div className="user-card__header">
        <div className="user-card__avatar">
          <img
            src={user.avatar_url || '/default-avatar.svg'}
            alt={user.name}
            className="avatar"
          />
          {isDeleted && <div className="deleted-badge">Удален</div>}
        </div>
        <div className="user-card__info">
          <h3 className="user-card__name">
            {user.name} {user.user_surname}
          </h3>
          <p className="user-card__email">{user.email}</p>
          {user.username && (
            <p className="user-card__username">@{user.username}</p>
          )}
        </div>
      </div>

      <div className="user-card__details">
        <div className="user-card__meta">
          <div className="meta-item">
            <span className="meta-label">Роли:</span>
            <span className="meta-value">
              {userRoles.length > 0 ? userRoles.join(', ') : 'Пользователь'}
            </span>
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

        {/* Информация из полей пользователя вместо профиля */}
        <div className="user-card__profile">
          <p className="profile-bio">{user.bio || 'Нет описания'}</p>
          <div className="profile-stats">
            <span>Страна: {user.country || 'Не указана'}</span>
            {user.website && <span>Сайт: {user.website}</span>}
          </div>
        </div>

        <div className="user-card__stats">
          <div className="stat">
            <span className="stat-number">{user.posts_count || 0}</span>
            <span className="stat-label">Публикаций</span>
          </div>
          <div className="stat">
            <span className="stat-number">{user.followers_count || 0}</span>
            <span className="stat-label">Подписчиков</span>
          </div>
        </div>
      </div>

      <div className="user-card__actions">
        <button
          className="btn btn-primary btn-sm"
          onClick={() => onAction('view', user.id)}
        >
          Просмотреть
        </button>
        
        {isDeleted ? (
          <button
            className="btn btn-success btn-sm"
            onClick={() => onAction('restore', user.id)}
          >
            Восстановить
          </button>
        ) : (
          <button
            className="btn btn-danger btn-sm"
            onClick={() => onAction('delete', user.id)}
            disabled={userRoles.includes('admin')}
          >
            Удалить
          </button>
        )}
      </div>
    </div>
  );
}

export default UserCard;