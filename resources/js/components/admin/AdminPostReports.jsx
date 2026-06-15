import React, { useState, useEffect, useCallback } from 'react';
import { apiFetchLocal as apiFetch } from '../../api';
import { useToast } from '../../contexts/ToastContext';
import PostReportCard from './PostReportCard';
import ConfirmModal from '../modals/ConfirmModal';
import EmptyState from '../common/EmptyState';
import Alert from '../common/Alert';
import AdminModerationStats from './AdminModerationStats';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Ожидают рассмотрения' },
  { value: 'confirmed', label: 'Подтверждённые' },
  { value: 'rejected', label: 'Отклонённые' },
  { value: 'all', label: 'Все' },
];

function AdminPostReports({ onViewPost }) {
  const toast = useToast().toast;
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState(null);
  const [confirmBan, setConfirmBan] = useState({ open: false, user: null });
  const [banReason, setBanReason] = useState('');
  const [banLoading, setBanLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const response = await apiFetch('/api/admin/post-reports/stats');
      if (response.ok) {
        setStats(await response.json());
      }
    } catch {
      /* ignore */
    }
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        status: statusFilter,
        ...(searchQuery && { search: searchQuery }),
      });
      const response = await apiFetch(`/api/admin/post-reports?${params}`);
      if (response.ok) {
        const data = await response.json();
        setReports(data.data || []);
        setTotalPages(data.last_page || 1);
        setError(null);
      } else {
        setError('Не удалось загрузить жалобы на публикации');
      }
    } catch {
      setError('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, searchQuery]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const refreshAll = () => {
    fetchReports();
    fetchStats();
  };

  const confirmReport = async (reportId) => {
    try {
      const response = await apiFetch(`/api/admin/post-reports/${reportId}/confirm`, { method: 'POST' });
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.success(data?.message || 'Жалоба подтверждена. Публикация скрыта.');
        refreshAll();
      } else {
        const data = await response.json().catch(() => ({}));
        toast.error(data?.message || 'Не удалось подтвердить жалобу');
      }
    } catch {
      toast.error('Ошибка соединения с сервером');
    }
  };

  const rejectReport = async (reportId) => {
    try {
      const response = await apiFetch(`/api/admin/post-reports/${reportId}/reject`, { method: 'POST' });
      if (response.ok) {
        toast.success('Жалоба отклонена');
        refreshAll();
      } else {
        const data = await response.json().catch(() => ({}));
        toast.error(data?.message || 'Не удалось отклонить жалобу');
      }
    } catch {
      toast.error('Ошибка соединения с сервером');
    }
  };

  const banUser = async (userId, reason) => {
    const trimmed = (reason || '').trim();
    if (trimmed.length < 3) {
      toast.error('Укажите причину блокировки (не менее 3 символов)');
      return;
    }
    setBanLoading(true);
    try {
      const response = await apiFetch(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ban_reason: trimmed }),
      });

      if (response.ok) {
        toast.success('Пользователь заблокирован');
        setConfirmBan({ open: false, user: null });
        setBanReason('');
        refreshAll();
      } else {
        const data = await response.json().catch(() => ({}));
        const validationMsg = data.errors?.ban_reason?.[0];
        toast.error(validationMsg || data.message || 'Не удалось заблокировать пользователя');
      }
    } catch {
      toast.error('Ошибка соединения с сервером');
    } finally {
      setBanLoading(false);
    }
  };

  const openBanModal = (author) => {
    if (!author?.id) return;
    setBanReason('');
    setConfirmBan({ open: true, user: author });
  };

  return (
    <div className="admin-post-reports">
      <div className="admin-section-header">
        <h2>Жалобы на публикации</h2>
        {stats && (
          <AdminModerationStats
            items={[
              { value: stats.pending, label: 'Ожидают' },
              { value: stats.confirmed, label: 'Подтверждены' },
              { value: stats.rejected, label: 'Отклонены' },
              { value: stats.total, label: 'Всего' },
            ]}
          />
        )}
        <Alert type="error" message={error} onClose={() => setError('')} className="admin-alert" />
        <div className="admin-filters admin-filters--sticky">
          <input
            type="text"
            placeholder="Поиск по публикации или автору жалобы..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="admin-search-input"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="filter-select"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">Загрузка жалоб...</div>
      ) : (
        <>
          <div className="admin-post-reports-list">
            {reports.map((report) => (
              <PostReportCard
                key={report.id}
                report={report}
                onConfirm={confirmReport}
                onReject={rejectReport}
                onBan={openBanModal}
                onViewPost={onViewPost}
              />
            ))}
          </div>

          {reports.length === 0 && (
            <EmptyState
              title="Жалобы не найдены"
              text="Попробуйте изменить фильтр или дождитесь новых обращений пользователей."
              actions={
                statusFilter !== 'pending' ? (
                  <button
                    type="button"
                    className="admin-btn admin-btn-outline admin-btn-sm"
                    onClick={() => { setStatusFilter('pending'); setSearchQuery(''); setCurrentPage(1); }}
                  >
                    Показать ожидающие
                  </button>
                ) : null
              }
            />
          )}

          {totalPages > 1 && (
            <div className="admin-pagination">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn btn-outline"
              >
                Назад
              </button>
              <span className="admin-pagination-info">
                Страница {currentPage} из {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn btn-outline"
              >
                Вперед
              </button>
            </div>
          )}
        </>
      )}

      <ConfirmModal
        open={confirmBan.open}
        title="Блокировка пользователя"
        message={
          confirmBan.user
            ? `Укажите причину блокировки пользователя ${`${confirmBan.user.name || ''} ${confirmBan.user.user_surname || ''}`.trim() || confirmBan.user.email || ''}. Пользователь не сможет публиковать, комментировать и выполнять социальные действия.`
            : 'Укажите причину блокировки. Пользователь не сможет публиковать, комментировать и выполнять социальные действия.'
        }
        confirmText="Заблокировать"
        variant="danger"
        reasonLabel="Причина блокировки"
        reasonPlaceholder="Укажите причину блокировки"
        reasonValue={banReason}
        onReasonChange={setBanReason}
        isLoading={banLoading}
        onConfirm={() => {
          if (confirmBan.user?.id) banUser(confirmBan.user.id, banReason);
        }}
        onClose={() => {
          if (!banLoading) {
            setConfirmBan({ open: false, user: null });
            setBanReason('');
          }
        }}
      />
    </div>
  );
}

export default AdminPostReports;
