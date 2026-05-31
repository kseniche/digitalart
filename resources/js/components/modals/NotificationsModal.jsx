import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiFetchLocal as apiFetch } from '../../api';
import { useToast } from '../../contexts/ToastContext';
import ConfirmModal from './ConfirmModal';

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function NotificationsModal({ onClose, onUnreadChange }) {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [emailHint, setEmailHint] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const load = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/notifications?per_page=20&page=${pageNum}`, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data.data) ? data.data : []);
        setLastPage(data.last_page || 1);
        setEmailHint(data.email_hint || 'Подробная информация направлена на вашу электронную почту.');
        if (pageNum === 1) {
          const countRes = await apiFetch('/api/notifications/unread-count', {
            headers: { Accept: 'application/json' },
          });
          if (countRes.ok) {
            const c = await countRes.json();
            onUnreadChange(typeof c.unread_count === 'number' ? c.unread_count : 0);
          }
        }
      }
    } catch {
      toast.error('Не удалось загрузить уведомления');
    } finally {
      setLoading(false);
    }
  }, [toast, onUnreadChange]);

  useEffect(() => {
    load(page);
  }, [load, page]);

  const markRead = async (id) => {
    try {
      const res = await apiFetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
        );
        onUnreadChange((c) => Math.max(0, c - 1));
      }
    } catch {
      toast.error('Не удалось отметить прочитанным');
    }
  };

  const markAllRead = async () => {
    try {
      const res = await apiFetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        setItems((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: n.read_at || new Date().toISOString() })));
        onUnreadChange(0);
        toast.success('Все уведомления прочитаны');
      }
    } catch {
      toast.error('Ошибка при отметке прочитанными');
    }
  };

  const removeOne = async (id) => {
    try {
      const res = await apiFetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const removed = items.find((n) => n.id === id);
        setItems((prev) => prev.filter((n) => n.id !== id));
        if (removed && !removed.is_read) {
          onUnreadChange((c) => Math.max(0, c - 1));
        }
      }
    } catch {
      toast.error('Не удалось удалить уведомление');
    }
  };

  const clearAll = async () => {
    try {
      const res = await apiFetch('/api/notifications', {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        setItems([]);
        onUnreadChange(0);
        toast.success('Уведомления очищены');
      }
    } catch {
      toast.error('Не удалось очистить уведомления');
    }
  };

  const handleOpen = (item) => {
    if (!item.is_read) {
      markRead(item.id);
    }
    if (item.action_url) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay notifications-modal-overlay" onClick={onClose} role="presentation">
      <div
        className={`modal-content notifications-modal${confirmClearAll ? ' notifications-modal--dimmed' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="notifications-modal-title"
        aria-hidden={confirmClearAll}
      >
        <div className="notifications-modal-header">
          <h2 id="notifications-modal-title">Уведомления</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        <div className="notifications-modal-toolbar">
          <button type="button" className="btn btn-outline btn-sm" onClick={markAllRead} disabled={loading || items.length === 0}>
            Прочитать все
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setConfirmClearAll(true)}
            disabled={loading || items.length === 0}
          >
            Очистить все
          </button>
        </div>

        <div className="notifications-modal-body">
          {loading && <p className="notifications-empty">Загрузка…</p>}
          {!loading && items.length === 0 && (
            <p className="notifications-empty">У вас пока нет уведомлений</p>
          )}
          {!loading && items.map((item) => (
            <article
              key={item.id}
              className={`notification-item${item.is_read ? '' : ' notification-item--unread'}`}
            >
              <div className="notification-item-main">
                <h3 className="notification-item-title">{item.title}</h3>
                <p className="notification-item-body">{item.body}</p>
                {item.email_sent && (
                  <p className="notification-item-email-hint">{emailHint}</p>
                )}
                <time className="notification-item-time" dateTime={item.created_at}>
                  {formatDate(item.created_at)}
                </time>
              </div>
              <div className="notification-item-actions">
                {item.action_url && (
                  <Link
                    to={item.action_url}
                    className="btn btn-primary btn-sm"
                    onClick={() => handleOpen(item)}
                  >
                    Перейти
                  </Link>
                )}
                {!item.is_read && (
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => markRead(item.id)}>
                    Прочитано
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-outline btn-sm notification-item-delete"
                  onClick={() => removeOne(item.id)}
                  aria-label="Удалить уведомление"
                >
                  Удалить
                </button>
              </div>
            </article>
          ))}
        </div>

        {lastPage > 1 && (
          <div className="notifications-modal-pagination">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Назад
            </button>
            <span>
              {page} / {lastPage}
            </span>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={page >= lastPage || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Далее
            </button>
          </div>
        )}
      </div>

      <ConfirmModal
        open={confirmClearAll}
        title="Очистить уведомления"
        message="Удалить все уведомления? Это действие нельзя отменить."
        confirmText="Удалить все"
        cancelText="Отмена"
        variant="danger"
        overlayClassName="notifications-confirm-overlay"
        onConfirm={() => {
          setConfirmClearAll(false);
          clearAll();
        }}
        onClose={() => setConfirmClearAll(false)}
      />
    </div>
  );
}

export default NotificationsModal;
