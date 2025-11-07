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
        Добавить работу
      </Link>
      <Link to="/settings" className="dropdown-item" onClick={onClose}>
        Настройки
      </Link>
      {isAdmin && (
        <>
          <hr style={{ margin: '0.5rem 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />
          <Link to="/admin" className="dropdown-item admin-link" onClick={onClose}>
             Панель администратора
          </Link>
        </>
      )}
      <hr style={{ margin: '0.5rem 0', border: 'none', borderTop: '2px solid #7B0000 ' }} />
      <button className="dropdown-item" onClick={onLogout} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}>
        Выйти
      </button>
    </div>
  );
}

export default UserDropdown;





