import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api';
import { useToast } from '../../contexts/ToastContext';
import CommentCard from './CommentCard';
import ConfirmModal from '../modals/ConfirmModal';
import EmptyState from '../common/EmptyState';
import Alert from '../common/Alert';

function AdminComments() {
  const toast = useToast().toast;
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [autoModerationFilter, setAutoModerationFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [successMessage, setSuccessMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState({ open: false, commentId: null });
  const [newBannedWord, setNewBannedWord] = useState('');

  useEffect(() => {
    fetchComments();
  }, [statusFilter, autoModerationFilter, searchQuery, currentPage]);


  const fetchComments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(autoModerationFilter !== 'all' && { auto_moderation: autoModerationFilter }),
        ...(searchQuery && { search: searchQuery }),
      });

      const response = await apiFetch(`/api/admin/comments?${params}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setComments(data.data || []);
        setTotalPages(data.last_page || 1);
        setError(null);
      } else {
        const msg = 'Не удалось загрузить список комментариев. Попробуйте позже.';
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

  const addBannedWord = async (e) => {
    e.preventDefault();
    const word = newBannedWord.trim();
    if (!word) return;

    try {
      const response = await apiFetch('/api/admin/banned-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word }),
      });

      if (response.ok) {
        setNewBannedWord('');
        toast.success('Слово добавлено в словарь');
      } else {
        const data = await response.json().catch(() => ({}));
        toast.error(data?.message || 'Не удалось добавить слово');
      }
    } catch {
      toast.error('Ошибка соединения с сервером');
    }
  };

  const handleCommentAction = (action, commentId) => {
    if (action === 'delete') {
      setConfirmDelete({ open: true, commentId });
    } else if (action === 'approve') {
      approveComment(commentId);
    }
  };

  const deleteComment = async (commentId) => {
    try {
      const response = await apiFetch(`/api/admin/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const msg = 'Комментарий успешно удалён';
        setSuccessMessage(msg);
        toast.success(msg);
        fetchComments();
      } else {
        const msg = 'Не удалось удалить комментарий';
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = 'Ошибка соединения с сервером';
      setError(msg);
      toast.error(msg);
    }
  };

  const approveComment = async (commentId) => {
    try {
      const response = await apiFetch(`/api/admin/comments/${commentId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const msg = 'Комментарий одобрен';
        setSuccessMessage(msg);
        toast.success(msg);
        fetchComments();
      } else {
        const msg = 'Не удалось одобрить комментарий';
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = 'Ошибка соединения с сервером';
      setError(msg);
      toast.error(msg);
    }
  };


  return (
    <div className="admin-comments">
      <ConfirmModal
        open={confirmDelete.open}
        title="Удаление комментария"
        message="Вы уверены, что хотите удалить этот комментарий?"
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
        onConfirm={() => {
          if (confirmDelete.commentId) deleteComment(confirmDelete.commentId);
          setConfirmDelete({ open: false, commentId: null });
        }}
        onClose={() => setConfirmDelete({ open: false, commentId: null })}
      />
      <div className="admin-section-header">
        <h2>Модерация комментариев</h2>
        
        {/* Сообщения об успехе и ошибках */}
        <Alert type="success" message={successMessage} onClose={() => setSuccessMessage('')} className="admin-alert" />
        <Alert type="error" message={error} onClose={() => setError('')} className="admin-alert" />
        <div className="admin-filters admin-filters--sticky">
          <input
            type="text"
            placeholder="Поиск по содержимому комментария..."
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
            <option value="pending">На модерации</option>
            <option value="approved">Одобренные</option>
            <option value="deleted">Удаленные</option>
            <option value="all">Все комментарии</option>
          </select>

          <select
            value={autoModerationFilter}
            onChange={(e) => {
              setAutoModerationFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="filter-select"
          >
            <option value="all">Все</option>
            <option value="passed">Прошли автомодерацию</option>
            <option value="failed">Не прошли автомодерацию</option>
          </select>
        </div>
      </div>

      <div className="admin-banned-words">
        <h3 className="admin-banned-words__title">Словарь запрещенных слов</h3>
        <form className="admin-banned-words__form" onSubmit={addBannedWord}>
          <input
            type="text"
            placeholder="Добавить новое слово..."
            value={newBannedWord}
            onChange={(e) => setNewBannedWord(e.target.value)}
            className="admin-search-input"
          />
          <button type="submit" className="admin-btn admin-btn-primary admin-btn-sm">Добавить</button>
        </form>
      </div>

      {loading ? (
        <div className="admin-skeleton-list">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="admin-skeleton-card">
              <div className="admin-skeleton admin-skeleton--line" />
              <div className="admin-skeleton admin-skeleton--line short" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <>
          <div className="comments-list">
            {comments.map(comment => (
              <CommentCard
                key={comment.id}
                comment={comment}
                onAction={handleCommentAction}
              />
            ))}
          </div>

          {comments.length === 0 && (
            <EmptyState
              title="Комментарии не найдены"
              text="Нет элементов по текущему фильтру. Проверьте очередь модерации."
              actions={
                <>
                  <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={() => { setStatusFilter('pending'); setCurrentPage(1); }}>
                    Перейти в модерацию
                  </button>
                  <button className="admin-btn admin-btn-outline admin-btn-sm" onClick={() => { setStatusFilter('all'); setSearchQuery(''); setCurrentPage(1); }}>
                    Сбросить фильтры
                  </button>
                </>
              }
            />
          )}

          {totalPages > 1 && (
            <div className="admin-pagination">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="btn btn-outline"
              >
                Назад
              </button>
              <span className="admin-pagination-info">
                Страница {currentPage} из {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="btn btn-outline"
              >
                Вперед
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AdminComments;


