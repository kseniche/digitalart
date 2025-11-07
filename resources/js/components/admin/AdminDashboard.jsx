import React from 'react';

function AdminDashboard({ stats, onRefresh }) {
  const handleDownloadReport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/report', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
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
      alert('Отчёт успешно загружен');
    } catch (error) {
      alert('Ошибка при скачивании отчёта');
    }
  };

  if (!stats) {
    return (
      <div className="admin-dashboard">
        <div className="loading">Загрузка статистики...</div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Всего пользователей',
      value: stats.total_users,
      subtitle: `Активных: ${stats.active_users}`,
      color: 'blue',
      
    },
    {
      title: 'Всего публикаций',
      value: stats.total_posts,
      subtitle: `Активных: ${stats.active_posts}`,
      color: 'green',
      
    },
    {
      title: 'Всего комментариев',
      value: stats.total_comments,
      subtitle: `Активных: ${stats.active_comments}`,
      color: 'purple',
      
    },
    {
      title: 'Удаленных пользователей',
      value: stats.deleted_users,
      subtitle: 'Требуют восстановления',
      color: '#7B0000',
      
    }
  ];

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h2>Общая статистика</h2>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
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
            <div className="stat-card__icon">{card.icon}</div>
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


