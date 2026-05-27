import React from 'react';
import { apiFetch } from '../../api';
import { useToast } from '../../contexts/ToastContext';
import EmptyState from '../common/EmptyState';

function AdminDashboard({ stats, onRefresh }) {
  const toast = useToast().toast;

  const handleDownloadReport = async () => {
    try {
      const response = await apiFetch('/api/admin/report', {
        method: 'GET',
        headers: {
          'Accept': 'text/csv',
        },
      });

      if (!response.ok) {
        throw new Error('Ошибка при генерации отчета');
      }

      // Получаем blob для скачивания
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Формируем имя файла с датой
      const date = new Date().toISOString().split('T')[0];
      a.download = `report_${date}.csv`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Отчёт успешно загружен');
    } catch (error) {
      toast.error('Ошибка при скачивании отчёта');
    }
  };

  if (!stats) {
    return (
      <div className="admin-dashboard">
        <EmptyState
          title="Статистика загружается"
          text="Подождите немного или обновите данные вручную."
          actions={<button className="admin-btn admin-btn-primary admin-btn-sm" onClick={onRefresh}>Обновить</button>}
        />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Всего пользователей',
      value: stats.total_users,
      subtitle: `Активных: ${stats.active_users}`,
      color: 'brand',
    },
    {
      title: 'Всего публикаций',
      value: stats.total_posts,
      subtitle: `Активных: ${stats.active_posts}`,
      color: 'brand',
    },
    {
      title: 'Всего комментариев',
      value: stats.total_comments,
      subtitle: `Активных: ${stats.active_comments}`,
      color: 'brand',
    },
    {
      title: 'Удаленных пользователей',
      value: stats.deleted_users,
      subtitle: 'Требуют восстановления',
      color: 'brand',
    },
  ];

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h2>Общая статистика</h2>
        <div className="admin-dashboard-actions">
          <button 
            className="btn btn-primary"
            onClick={onRefresh}
          >
            Обновить
          </button>
          <button 
            className="admin-btn-report"
            onClick={handleDownloadReport}
            title="Скачать полный отчет о системе"
          >
            Отчет
          </button>
        </div>
      </div>

      <div className="stats-grid">
        {statCards.map((card, index) => (
          <div key={index} className={`stat-card stat-card--${card.color}`}>
            <div className="stat-card__content">
              <h3 className="stat-card__title">{card.title}</h3>
              <div className="stat-card__value">{card.value}</div>
              <div className="stat-card__subtitle">{card.subtitle}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminDashboard;


