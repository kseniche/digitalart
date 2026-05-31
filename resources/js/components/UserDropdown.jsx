import React from 'react';
import { Link } from 'react-router-dom';
import '../../css/app.css';
function UserDropdown({ user, onClose, onLogout }) {
  const isAdmin = user.roles?.some(role => role.name === 'admin');

  return (
    <div className="dropdown-menu">
      <Link to={`/profile/${user.id}`} className="dropdown-item" onClick={onClose}>
        Мой профиль
      </Link>
      <Link to="/create" className="dropdown-item" onClick={onClose}>
        Работу добавить
      </Link>
      <Link to="/settings" className="dropdown-item" onClick={onClose}>
        Настройки
      </Link>
      {isAdmin && (
        <>
          <hr className="dropdown-divider" />
          <Link to="/admin" className="dropdown-item admin-link" onClick={onClose}>
             Панель администратора
          </Link>
        </>
      )}
      <hr className="dropdown-divider dropdown-divider--strong" />
      <button className="dropdown-item dropdown-button" onClick={onLogout}>
        Выйти
      </button>
    </div>
  );
}

export default UserDropdown;





