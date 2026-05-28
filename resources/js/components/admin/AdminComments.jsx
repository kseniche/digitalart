import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../api';
import { useToast } from '../../contexts/ToastContext';
import CommentCard from './CommentCard';
import ConfirmModal from '../modals/ConfirmModal';
import EmptyState from '../common/EmptyState';
import Alert from '../common/Alert';
import MediaPreview from '../common/MediaPreview';
import AdminModerationStats from './AdminModerationStats';

const TABS = [
  { id: 'recent', label: 'Недавно опубликованные' },
  { id: 'reports', label: 'Жалобы' },
  { id: 'all', label: 'Все комментарии' },
];

const ALL_STATUS_OPTIONS = [
  { value: 'all', label: 'Все' },
  { value: 'pending_review', label: 'На модерации' },
  { value: 'reviewed', label: 'Проверенные' },
  { value: 'hidden', label: 'Скрытые' },
  { value: 'with_reports', label: 'С жалобами' },
  { value: 'deleted', label: 'Удалённые' },
];

function AdminComments() {
  const toast = useToast().toast;
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('recent');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [successMessage, setSuccessMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState({ open: false, commentId: null });
  const [newBannedWord, setNewBannedWord] = useState('');
  const [stats, setStats] = useState(null);
  const [selectedPostDetail, setSelectedPostDetail] = useState(null);
  const [postDetailLoading, setPostDetailLoading] = useState(false);
  const [confirmDeleteComment, setConfirmDeleteComment] = useState({ open: false, commentId: null });

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPostTags = (tags) => {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    if (typeof tags === 'string') {
      try {
        const parsed = JSON.parse(tags);
        if (Array.isArray(parsed)) return parsed;
      } catch (_) {
        return tags.split(',').map((t) => t.trim()).filter(Boolean);
      }
    }
    return [];
  };

  const fetchStats = useCallback(async () => {
    try {
      const response = await apiFetch('/api/admin/comments/stats');
      if (response.ok) {
        setStats(await response.json());
      }
    } catch {
      /* ignore */
    }
  }, []);

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        tab,
        ...(tab === 'all' && statusFilter !== 'all' && { status: statusFilter }),
        ...(searchQuery && { search: searchQuery }),
      });

      const response = await apiFetch(`/api/admin/comments?${params}`);

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
    } catch {
      const msg = 'Ошибка соединения с сервером';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [currentPage, tab, statusFilter, searchQuery, toast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const refreshAll = () => {
    fetchComments();
    fetchStats();
    if (selectedPostDetail?.post?.id) {
      fetchPostDetail(selectedPostDetail.post.id);
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

  const fetchPostDetail = async (postId) => {
    try {
      setPostDetailLoading(true);
      const response = await apiFetch(`/api/admin/posts/${postId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedPostDetail({ post: data.post, comments: data.comments || [] });
        setError(null);
      } else {
        const msg = 'Не удалось загрузить публикацию';
        setError(msg);
        toast.error(msg);
      }
    } catch {
      const msg = 'Ошибка соединения с сервером';
      setError(msg);
      toast.error(msg);
    } finally {
      setPostDetailLoading(false);
    }
  };

  const confirmComment = async (commentId) => {
    try {
      const response = await apiFetch(`/api/admin/comments/${commentId}/confirm`, { method: 'POST' });
      if (response.ok) {
        toast.success('Комментарий подтверждён');
        refreshAll();
      } else {
        toast.error('Не удалось подтвердить комментарий');
      }
    } catch {
      toast.error('Ошибка соединения с сервером');
    }
  };

  const dismissReports = async (commentId) => {
    try {
      const response = await apiFetch(`/api/admin/comments/${commentId}/dismiss-reports`, { method: 'POST' });
      if (response.ok) {
        toast.success('Жалобы сняты');
        refreshAll();
      } else {
        const data = await response.json().catch(() => ({}));
        toast.error(data?.message || 'Не удалось снять жалобы');
      }
    } catch {
      toast.error('Ошибка соединения с сервером');
    }
  };

  const unhideComment = async (commentId) => {
    try {
      const response = await apiFetch(`/api/admin/comments/${commentId}/unhide`, { method: 'POST' });
      if (response.ok) {
        toast.success('Комментарий снова отображается на сайте');
        refreshAll();
      } else {
        toast.error('Не удалось восстановить комментарий');
      }
    } catch {
      toast.error('Ошибка соединения с сервером');
    }
  };

  const deleteComment = async (commentId) => {
    try {
      const response = await apiFetch(`/api/admin/comments/${commentId}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success('Комментарий удалён');
        refreshAll();
      } else {
        toast.error('Не удалось удалить комментарий');
      }
    } catch {
      toast.error('Ошибка соединения с сервером');
    }
  };

  const deleteWithBannedWords = async (commentId, words) => {
    try {
      const response = await apiFetch(`/api/admin/comments/${commentId}/delete-with-banned-words`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words }),
      });
      if (response.ok) {
        toast.success('Комментарий удалён, слова добавлены в словарь');
        refreshAll();
      } else {
        toast.error('Не удалось удалить комментарий');
      }
    } catch {
      toast.error('Ошибка соединения с сервером');
    }
  };

  const approveComment = async (commentId) => {
    try {
      const response = await apiFetch(`/api/admin/comments/${commentId}/approve`, { method: 'POST' });
      if (response.ok) {
        toast.success('Комментарий одобрен');
        refreshAll();
      } else {
        toast.error('Не удалось одобрить комментарий');
      }
    } catch {
      toast.error('Ошибка соединения с сервером');
    }
  };

  if (selectedPostDetail) {
    const post = selectedPostDetail.post;
    const tags = getPostTags(post?.tags);
    const isPendingPost = post?.moderation_status !== 'approved';

    return (
      <div className="admin-comments">
        <ConfirmModal
          open={confirmDeleteComment.open}
          title="Удаление комментария"
          message="Комментарий будет удалён без возможности восстановления. Продолжить?"
          confirmText="Удалить"
          cancelText="Отмена"
          variant="danger"
          onConfirm={() => {
            if (confirmDeleteComment.commentId) deleteComment(confirmDeleteComment.commentId);
            setConfirmDeleteComment({ open: false, commentId: null });
          }}
          onClose={() => setConfirmDeleteComment({ open: false, commentId: null })}
        />
        <div className="user-detail__header">
          <button type="button" className="btn btn-outline" onClick={() => setSelectedPostDetail(null)}>
            ← Назад к комментариям
          </button>
          <h2>Публикация и комментарии</h2>
        </div>
        {postDetailLoading ? (
          <div className="loading">Загрузка публикации...</div>
        ) : (
          <div className="admin-detail-wrap">
            <div className="fixed-height-card admin-detail-card">
              <div className="card-image-wrapper admin-detail-media">
                <MediaPreview
                  src={post?.image_url}
                  mediaType={post?.media_type}
                  alt={post?.post_title}
                  className="admin-detail-media-el"
                />
              </div>
              <div className="card-info admin-detail-content">
                <h3 className="card-title admin-detail-title">{post?.post_title}</h3>
                <div className="card-author">
                  <div className="admin-inline-meta">
                    <img src={post?.author?.avatar_url || '/default-avatar.svg'} alt="" className="author-avatar" />
                    <span className="author-name">
                      {post?.author
                        ? `${post.author.name} ${post.author.user_surname || ''}`.trim()
                        : 'Неизвестный автор'}
                    </span>
                    <span className="admin-detail-date">• {formatDate(post?.created_at)}</span>
                  </div>
                </div>
                <p className="admin-detail-text">{post?.post_content || ''}</p>
                <div className="admin-tags-row">
                  {tags.map((tag, idx) => (
                    <span key={idx} className="admin-tag">#{String(tag).trim()}</span>
                  ))}
                  {post?.category?.name && <span className="admin-tag">Категория: {post.category.name}</span>}
                </div>
                {isPendingPost && (
                  <p className="admin-detail-hint">Публикация на модерации</p>
                )}
                <div className="admin-comments-shell">
                  <div className="admin-comments-title">
                    Комментарии ({selectedPostDetail.comments.length})
                  </div>
                  <div className="admin-comments-list-inline">
                    {selectedPostDetail.comments.map((comment) => {
                      const isDeletedComment = !!comment.deleted_at;
                      return (
                        <div
                          key={comment.id}
                          className={`admin-comment-inline${isDeletedComment ? ' admin-comment-inline--deleted' : ''}`}
                        >
                          <div className="admin-comment-toolbar">
                            <div className="admin-comment-toolbar__meta">
                              <img
                                src={comment.author?.avatar_url || '/default-avatar.svg'}
                                alt=""
                                className="author-avatar"
                              />
                              <strong className="admin-comment-author">
                                {comment.author
                                  ? `${comment.author.name} ${comment.author.user_surname || ''}`.trim()
                                  : 'Неизвестный автор'}
                              </strong>
                              <span className="admin-comment-date">• {formatDate(comment.created_at)}</span>
                              {comment.is_hidden && (
                                <span className="admin-status-badge admin-status-badge--pending">Скрыт</span>
                              )}
                            </div>
                            <div className="admin-comment-toolbar__actions">
                              {!isDeletedComment && comment.moderation_status !== 'approved' && (
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  onClick={() => approveComment(comment.id)}
                                >
                                  Одобрить
                                </button>
                              )}
                              {!isDeletedComment && comment.is_hidden && (
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  onClick={() => unhideComment(comment.id)}
                                >
                                  Восстановить
                                </button>
                              )}
                              {!isDeletedComment && (
                                <button
                                  type="button"
                                  className="btn btn-danger btn-sm"
                                  onClick={() =>
                                    setConfirmDeleteComment({ open: true, commentId: comment.id })
                                  }
                                >
                                  Удалить
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="admin-comment-text">{comment.comment_content}</p>
                        </div>
                      );
                    })}
                    {selectedPostDetail.comments.length === 0 && (
                      <EmptyState title="Комментарии не найдены" compact />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="admin-comments">
      <ConfirmModal
        open={confirmDelete.open}
        title="Удаление комментария"
        message="Комментарий будет удалён без возможности восстановления. Продолжить?"
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

        {stats && (
          <AdminModerationStats
            items={[
              { value: stats.pending_review, label: 'На проверке' },
              { value: stats.reports, label: 'Жалобы' },
              { value: stats.hidden, label: 'Скрытые' },
              { value: stats.total, label: 'Всего' },
              { value: stats.deleted_last_30_days, label: 'Удалено за 30 дней' },
            ]}
          />
        )}

        <Alert type="success" message={successMessage} onClose={() => setSuccessMessage('')} className="admin-alert" />
        <Alert type="error" message={error} onClose={() => setError('')} className="admin-alert" />

        <div className="admin-tabs" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`admin-btn admin-btn-sm ${tab === t.id ? 'admin-btn-primary' : 'admin-btn-outline'}`}
              onClick={() => {
                setTab(t.id);
                setCurrentPage(1);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

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

          {tab === 'all' && (
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-select"
            >
              {ALL_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="admin-banned-words">
        <h3 className="admin-banned-words__title">Словарь запрещённых слов</h3>
        <form className="admin-banned-words__form" onSubmit={addBannedWord}>
          <input
            type="text"
            placeholder="Добавить новое слово..."
            value={newBannedWord}
            onChange={(e) => setNewBannedWord(e.target.value)}
            className="admin-search-input"
          />
          <button type="submit" className="admin-btn admin-btn-primary admin-btn-sm">
            Добавить
          </button>
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
            {comments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                tab={tab}
                onConfirm={confirmComment}
                onDelete={(id) => setConfirmDelete({ open: true, commentId: id })}
                onDeleteWithWords={deleteWithBannedWords}
                onUnhide={unhideComment}
                onDismissReports={dismissReports}
                onOpenPost={fetchPostDetail}
              />
            ))}
          </div>

          {comments.length === 0 && (
            <EmptyState
              title="Комментарии не найдены"
              text="Нет комментариев по выбранному фильтру."
              actions={
                <button
                  type="button"
                  className="admin-btn admin-btn-outline admin-btn-sm"
                  onClick={() => {
                    setTab('recent');
                    setStatusFilter('all');
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                >
                  Показать недавние
                </button>
              }
            />
          )}

          {totalPages > 1 && (
            <div className="admin-pagination">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
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
