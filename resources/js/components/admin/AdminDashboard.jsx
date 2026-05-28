import React, { useState } from 'react';
import { apiFetch } from '../../api';
import { useToast } from '../../contexts/ToastContext';
import EmptyState from '../common/EmptyState';
import ReportPeriodModal, { REPORT_PERIOD_FILENAME_PART } from '../modals/ReportPeriodModal';

function AdminDashboard({ stats, onRefresh }) {
  const toast = useToast().toast;
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportPeriod, setReportPeriod] = useState('all');
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadReport = async (period) => {
    try {
      setIsDownloading(true);
      const periodParam = period && period !== 'all' ? `?period=${encodeURIComponent(period)}` : '';
      const response = await apiFetch(`/api/admin/report${periodParam}`, {
        method: 'GET',
        headers: {
          Accept: 'text/csv',
        },
      });

      if (!response.ok) {
        throw new Error('Ошибка при генерации отчета');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const date = new Date().toISOString().split('T')[0];
      const periodFile = REPORT_PERIOD_FILENAME_PART[period] || REPORT_PERIOD_FILENAME_PART.all;
      a.download = `отчет_${periodFile}_${date}.csv`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Отчёт успешно загружен');
      setShowReportModal(false);
    } catch (error) {
      toast.error('Ошибка при скачивании отчёта');
    } finally {
      setIsDownloading(false);
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
      <ReportPeriodModal
        open={showReportModal}
        period={reportPeriod}
        onPeriodChange={setReportPeriod}
        onConfirm={() => handleDownloadReport(reportPeriod)}
        onClose={() => !isDownloading && setShowReportModal(false)}
        isLoading={isDownloading}
      />

      <div className="dashboard-header">
        <h2>Общая статистика</h2>
        <div className="admin-dashboard-actions">
          <button className="btn btn-primary" onClick={onRefresh}>
            Обновить
          </button>
          <button
            className="admin-btn-report"
            onClick={() => setShowReportModal(true)}
            title="Скачать отчёт о системе за выбранный период"
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
