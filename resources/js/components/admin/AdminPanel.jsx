import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { apiFetchLocal as apiFetch } from '../../api';
import AdminDashboard from './AdminDashboard';
import AdminUsers from './AdminUsers';
import AdminPosts from './AdminPosts';
import AdminComments from './AdminComments';
import AdminCategories from './AdminCategories';
import EmptyState from '../common/EmptyState';
import Alert from '../common/Alert';
import AdminNavIcon from './AdminNavIcon';
import './AdminPanel.css';

const ADMIN_TABS = [
  { id: 'dashboard', label: 'Дашборд', shortLabel: 'Дашборд' },
  { id: 'users', label: 'Пользователи', shortLabel: 'Люди' },
  { id: 'posts', label: 'Публикации', shortLabel: 'Посты' },
  { id: 'comments', label: 'Комментарии', shortLabel: 'Коммент.' },
  { id: 'categories', label: 'Категории | Теги', shortLabel: 'Теги' },
];

function AdminPanel() {
  const navigate = useNavigate();
  const { user, isAdmin, logout, isLoading: authLoading } = useAuth();
  const toast = useToast().toast;
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Ранний редирект не-админов: без UI-глитча и без лишних admin-API запросов.
  useEffect(() => {
    if (!authLoading && user && !isAdmin) {
      navigate('/', { replace: true });
    }
  }, [authLoading, user, isAdmin, navigate]);

  const fetchStats = async () => {
    try {
      const response = await apiFetch('/api/admin/stats', {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
        setError('');
      } else {
        const msg = 'Не удалось загрузить статистику. Попробуйте позже.';
        setError(msg);
      }
    } catch (err) {
      const msg = 'Ошибка соединения с сервером';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Подгружаем статистику только когда пользователь точно админ.
  useEffect(() => {
    if (authLoading) return;
    if (!user || !isAdmin) return;

    setLoading(true);
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, isAdmin]);

  const handleLogout = async () => {
    try {
      await logout();
      // После выхода перенаправляем на главную страницу
      window.location.href = '/';
    } catch (error) {
      // Ошибка при выходе
    }
  };

  const handleExitAdmin = () => {
    // Просто возвращаемся на главную страницу без выхода из аккаунта
    window.location.href = '/';
  };

  // Ждем пока AuthContext определит текущие роли пользователя
  if (authLoading) {
    return (
      <div className="admin-panel">
        <EmptyState title="Загрузка админ-панели" text="Подождите, данные подготавливаются." />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="admin-panel">
        <div className="access-denied">
          <EmptyState
            title="Доступ запрещен"
            text={`У вас нет прав администратора для доступа к этой панели. Роли пользователя: ${user?.roles?.map(role => role.name || role).join(', ') || 'нет ролей'}`}
            actions={<button className="btn btn-primary" onClick={() => window.location.href = '/'}>На главную</button>}
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-panel">
        <EmptyState title="Загрузка админ-панели" text="Подождите, данные подготавливаются." />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <AdminDashboard stats={stats} onRefresh={fetchStats} />
        );
      case 'users':
        return <AdminUsers />;
      case 'posts':
        return <AdminPosts />;
      case 'comments':
        return <AdminComments />;
      case 'categories':
        return <AdminCategories />;
      default:
        return (
          <AdminDashboard stats={stats} onRefresh={fetchStats} />
        );
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <div className="admin-header-content">
          <div className="admin-header-buttons">
            <button
              type="button"
              className="admin-header-icon-btn"
              onClick={handleExitAdmin}
              aria-label="Выйти из админ-панели"
              title="Выйти из админ-панели"
            >
              <span aria-hidden="true">←</span>
            </button>

            <button
              type="button"
              className="admin-header-icon-btn admin-header-icon-btn--danger"
              onClick={() => setShowLogoutConfirm(true)}
              aria-label="Выйти из аккаунта"
              title="Выйти из аккаунта"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="admin-content">
        <div className="admin-sidebar">
          <nav className="admin-nav" aria-label="Разделы админ-панели">
            {ADMIN_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`admin-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="nav-icon">
                  <AdminNavIcon id={tab.id} />
                </span>
                <span className="nav-label">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="admin-main">
          {/* Сообщения об ошибках */}
          <Alert type="error" message={error} onClose={() => setError('')} className="admin-alert" />
          
          {renderContent()}
        </div>
      </div>

      <nav className="admin-bottom-nav" aria-label="Разделы админ-панели">
        {ADMIN_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`admin-bottom-nav__item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            aria-label={tab.label}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            <span className="admin-bottom-nav__icon">
              <AdminNavIcon id={tab.id} />
            </span>
            <span className="admin-bottom-nav__label">{tab.shortLabel}</span>
          </button>
        ))}
      </nav>

      {/* Модальное окно подтверждения выхода */}
      {showLogoutConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Подтверждение выхода</h3>
            </div>
            <div className="modal-body">
              <p>Вы уверены, что хотите выйти из аккаунта?</p>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-outline"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Отмена
              </button>
              <button
                className="btn btn-danger"
                onClick={handleLogout}
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;