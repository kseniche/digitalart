import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoginModal from './modals/LoginModal';
import RegisterModal from './modals/RegisterModal';
import UserDropdown from './UserDropdown';
import NotificationsBell from './NotificationsBell';
import '../../css/app.css';

function Header() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  // Скрываем хедер на странице админ панели
  if (location.pathname === '/admin') {
    return null;
  }

  const handleLogin = () => {
    setIsLoginModalOpen(false);
  };

  const handleRegister = () => {
    setIsRegisterModalOpen(false);
  };

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
  };

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">
          <img
            src="/images/logo.png"
            alt=""
            className="logo-img"
            width={40}
            height={40}
            decoding="async"
          />
          <span className="logo-text">Цифровое искусство</span>
        </Link>
        
        <div className="nav-buttons">
          {user ? (
            <>
            <NotificationsBell />
            <div className="user-menu">
              <div className="user-info user-info-inline">
                {/* Показываем бейдж администратора */}
                {isAdmin && (
                  <span className="user-role-badge" title="Администратор">
                    ADMIN
                  </span>
                )}
                {user.is_banned && (
                  <span className="user-role-badge" title="Заблокирован">
                    БАН
                  </span>
                )}
                <img
                  src={user.avatar_url || user.avatar || '/default-avatar.svg'}
                  alt="Аватар"
                  className="user-avatar"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  onError={(e) => {
                    e.target.src = '/default-avatar.svg';
                  }}
                />
              </div>
              {isUserMenuOpen && (
                <UserDropdown
                  user={user}
                  isAdmin={isAdmin}
                  onClose={() => setIsUserMenuOpen(false)}
                  onLogout={handleLogout}
                />
              )}
            </div>
            </>
          ) : (
            <>
              <button
                className="btn btn-outline"
                onClick={() => setIsLoginModalOpen(true)}
              >
                Войти
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setIsRegisterModalOpen(true)}
              >
                Регистрация
              </button>
            </>
          )}
        </div>
      </div>

      {isLoginModalOpen && (
        <LoginModal
          onClose={() => setIsLoginModalOpen(false)}
          onLogin={handleLogin}
          onSwitchToRegister={() => {
            setIsLoginModalOpen(false);
            setIsRegisterModalOpen(true);
          }}
        />
      )}

      {isRegisterModalOpen && (
        <RegisterModal
          onClose={() => setIsRegisterModalOpen(false)}
          onRegister={handleRegister}
          onSwitchToLogin={() => {
            setIsRegisterModalOpen(false);
            setIsLoginModalOpen(true);
          }}
        />
      )}
    </header>
  );
}

export default Header;