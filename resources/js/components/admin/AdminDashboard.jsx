import React, { useState, useEffect, useCallback } from 'react';
import { apiFetchLocal as apiFetch } from '../../api';
import { useToast } from '../../contexts/ToastContext';
import EmptyState from '../common/EmptyState';
import ReportPeriodModal, { REPORT_PERIOD_FILENAME_PART } from '../modals/ReportPeriodModal';
import AdminDashboardCharts from './AdminDashboardCharts';
import { ANALYTICS_PERIOD_OPTIONS } from './adminAnalyticsConstants';

function AdminDashboard({ stats, onRefresh }) {
  const toast = useToast().toast;
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportPeriod, setReportPeriod] = useState('all');
  const [isDownloading, setIsDownloading] = useState(false);
  const [chartPeriod, setChartPeriod] = useState('month');
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      setAnalyticsLoading(true);
      const response = await apiFetch(`/api/admin/analytics?period=${encodeURIComponent(chartPeriod)}`);
      if (response.ok) {
        setAnalytics(await response.json());
      } else {
        setAnalytics(null);
      }
    } catch {
      setAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [chartPeriod]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

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
          actions={<button type="button" className="admin-btn admin-btn-primary admin-btn-sm" onClick={onRefresh}>Обновить</button>}
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

  const summary = analytics?.summary;
  const periodSummaryCards = summary
    ? [
        { title: 'Новые пользователи', value: summary.new_users, subtitle: 'За выбранный период' },
        { title: 'Опубликовано работ', value: summary.published_posts, subtitle: 'Одобрено за период' },
        { title: 'На модерации', value: summary.pending_moderation, subtitle: 'Текущее состояние' },
        { title: 'Отклонено', value: summary.rejected_posts, subtitle: 'За выбранный период' },
        { title: 'Комментарии', value: summary.new_comments, subtitle: 'Создано за период' },
        { title: 'Удалённые комментарии', value: summary.deleted_comments, subtitle: 'За выбранный период' },
        {
          title: 'Среднее лайков',
          value: summary.avg_likes_per_post,
          subtitle: 'На одобренную публикацию',
        },
      ]
    : [];

  const renderRankingList = (title, items, valueKey = 'posts_count') => (
    <div className="admin-analytics-rank">
      <h4 className="admin-analytics-rank__title">{title}</h4>
      {!items?.length ? (
        <p className="admin-analytics-rank__empty">Нет данных за период</p>
      ) : (
        <ol className="admin-analytics-rank__list">
          {items.map((item, index) => (
            <li key={`${title}-${item.id ?? item.name}-${index}`} className="admin-analytics-rank__item">
              <span className="admin-analytics-rank__name">{item.name}</span>
              <span className="admin-analytics-rank__value">{item[valueKey]}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );

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
          <button type="button" className="btn btn-primary" onClick={onRefresh}>
            Обновить
          </button>
          <button
            type="button"
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

      <section className="admin-analytics-section" aria-labelledby="admin-analytics-heading">
        <div className="admin-analytics-section__header">
          <div>
            <h2 id="admin-analytics-heading">Аналитический центр</h2>
            <p className="admin-analytics-section__hint">
              Динамика и показатели платформы за выбранный период
            </p>
          </div>
          <div className="admin-analytics-period ui-segmented-control" role="group" aria-label="Период аналитики">
            {ANALYTICS_PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`ui-segmented-control__btn${chartPeriod === opt.value ? ' ui-segmented-control__btn--active' : ''}`}
                onClick={() => setChartPeriod(opt.value)}
                aria-pressed={chartPeriod === opt.value}
                disabled={analyticsLoading}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {analyticsLoading && !analytics ? (
          <p className="admin-analytics-loading">Загрузка аналитики…</p>
        ) : (
          <>
            {periodSummaryCards.length > 0 && (
              <div className="stats-grid admin-analytics-summary-grid">
                {periodSummaryCards.map((card) => (
                  <div key={card.title} className="stat-card stat-card--brand">
                    <div className="stat-card__content">
                      <h3 className="stat-card__title">{card.title}</h3>
                      <div className="stat-card__value">{card.value}</div>
                      <div className="stat-card__subtitle">{card.subtitle}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="admin-analytics-charts-grid">
              <AdminDashboardCharts
                title="Регистрации пользователей"
                data={analytics?.charts?.users}
                emptyMessage="За выбранный период новых регистраций нет"
              />
              <AdminDashboardCharts
                title="Созданные публикации"
                data={analytics?.charts?.posts}
                emptyMessage="За выбранный период публикации не создавались"
                color="#4b5563"
              />
            </div>

            <div className="admin-analytics-rankings">
              {renderRankingList('Популярные категории', analytics?.top_categories)}
              {renderRankingList('Популярные теги', analytics?.top_tags)}
              {renderRankingList('Топ авторов', analytics?.top_authors)}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default AdminDashboard;
