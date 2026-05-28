import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { apiFetch } from '../../api';
import AdminDashboard from './AdminDashboard';
import AdminUsers from './AdminUsers';
import AdminPosts from './AdminPosts';
import AdminComments from './AdminComments';
import AdminCategories from './AdminCategories';
import EmptyState from '../common/EmptyState';
import Alert from '../common/Alert';
import './AdminPanel.css';

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
        toast.error(msg);
      }
    } catch (err) {
      const msg = 'Ошибка соединения с сервером';
      setError(msg);
      toast.error(msg);
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

  const tabs = [
    { id: 'dashboard', label: 'Дашборд' },
    { id: 'users', label: 'Пользователи' },
    { id: 'posts', label: 'Публикации' },
    { id: 'comments', label: 'Комментарии' },
    { id: 'categories', label: 'Категории | Теги' },
  ];

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
              className="admin-btn-back"
              onClick={handleExitAdmin}
              title="Выйти из админ-панели"
            >
              ← Назад
            </button>
            
            <button
              className="btn btn-danger btn-sm"
              onClick={() => setShowLogoutConfirm(true)}
              title="Выйти из аккаунта"
            >
              Выйти
            </button>
          </div>
        </div>
      </div>

      <div className="admin-content">
        <div className="admin-sidebar">
          <nav className="admin-nav">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`admin-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="nav-icon">{tab.icon}</span>
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