import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api';
import { useToast } from '../../contexts/ToastContext';
import PostCard from './PostCard';
import ConfirmModal from '../modals/ConfirmModal';
import EmptyState from '../common/EmptyState';
import Alert from '../common/Alert';
import MediaPreview from '../common/MediaPreview';

function AdminPosts() {
  const toast = useToast().toast;
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [successMessage, setSuccessMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState({ open: false, postId: null });
  const [confirmReject, setConfirmReject] = useState({ open: false, postId: null });
  const [deleteReason, setDeleteReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');
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

  useEffect(() => {
    fetchPosts();
  }, [statusFilter, searchQuery, currentPage]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchQuery && { search: searchQuery }),
      });

      const response = await apiFetch(`/api/admin/posts?${params}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(data.data || []);
        setTotalPages(data.last_page || 1);
        setError(null);
      } else {
        const msg = 'Не удалось загрузить список публикаций. Попробуйте позже.';
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

  const handlePostAction = (action, postId) => {
    if (action === 'view') {
      fetchPostDetail(postId);
    } else if (action === 'delete') {
      setConfirmDelete({ open: true, postId });
    } else if (action === 'reject') {
      setConfirmReject({ open: true, postId });
    } else if (action === 'approve') {
      approvePost(postId);
    }
  };

  const handleCommentAction = (action, commentId) => {
    if (action === 'delete') {
      setConfirmDeleteComment({ open: true, commentId });
    } else if (action === 'approve') {
      approveComment(commentId);
    }
  };

  const fetchPostDetail = async (postId) => {
    try {
      setPostDetailLoading(true);
      const response = await apiFetch(`/api/admin/posts/${postId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedPostDetail({
          post: data.post,
          comments: data.comments || [],
        });
        setError(null);
      } else {
        const msg = 'Не удалось загрузить публикацию';
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = 'Ошибка соединения с сервером';
      setError(msg);
      toast.error(msg);
    } finally {
      setPostDetailLoading(false);
    }
  };

  const deletePost = async (postId) => {
    try {
      const response = await apiFetch(`/api/admin/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: deleteReason }),
      });

      if (response.ok) {
        const data = await response.json();
        const msg = data?.message || 'Публикация успешно удалена';
        setSuccessMessage(msg);
        toast.success(msg);
        fetchPosts();
        if (selectedPostDetail?.post?.id === postId) {
          setSelectedPostDetail(null);
        }
      } else {
        const msg = 'Не удалось удалить публикацию';
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = 'Ошибка соединения с сервером';
      setError(msg);
      toast.error(msg);
    }
  };

  const rejectPost = async (postId) => {
    try {
      const response = await apiFetch(`/api/admin/posts/${postId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: rejectReason }),
      });

      if (response.ok) {
        const data = await response.json();
        const msg = data?.message || 'Публикация отклонена';
        setSuccessMessage(msg);
        toast.success(msg);
        fetchPosts();
        if (selectedPostDetail?.post?.id === postId) {
          fetchPostDetail(postId);
        }
      } else {
        const msg = 'Не удалось отклонить публикацию';
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = 'Ошибка соединения с сервером';
      setError(msg);
      toast.error(msg);
    }
  };

  const approvePost = async (postId) => {
    try {
      const response = await apiFetch(`/api/admin/posts/${postId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const msg = 'Публикация одобрена';
        setSuccessMessage(msg);
        toast.success(msg);
        fetchPosts();
        if (selectedPostDetail?.post?.id === postId) {
          fetchPostDetail(postId);
        }
      } else {
        const msg = 'Не удалось одобрить публикацию';
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = 'Ошибка соединения с сервером';
      setError(msg);
      toast.error(msg);
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
        if (selectedPostDetail?.post?.id) {
          fetchPostDetail(selectedPostDetail.post.id);
        }
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
        if (selectedPostDetail?.post?.id) {
          fetchPostDetail(selectedPostDetail.post.id);
        }
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

  if (selectedPostDetail) {
    const post = selectedPostDetail.post;
    const tags = getPostTags(post?.tags);
    const isPendingPost = post?.moderation_status !== 'approved';

    return (
      <div className="admin-posts">
        <ConfirmModal
          open={confirmDelete.open}
          title="Удаление публикации за нарушение"
          message="Пост будет удален из-за нарушения правил сообщества, пользователь не сможет его исправить. Продолжить?"
          confirmText="Удалить за нарушение"
          cancelText="Отмена"
          variant="danger"
          onConfirm={() => {
            if (confirmDelete.postId) deletePost(confirmDelete.postId);
            setConfirmDelete({ open: false, postId: null });
            setDeleteReason('');
          }}
          onClose={() => {
            setConfirmDelete({ open: false, postId: null });
            setDeleteReason('');
          }}
          reasonLabel="Причина удаления (увидит пользователь)"
          reasonPlaceholder="Например: содержит запрещенный контент / разжигание ненависти"
          reasonValue={deleteReason}
          onReasonChange={setDeleteReason}
        />
        <ConfirmModal
          open={confirmReject.open}
          title="Отклонение публикации"
          message="Пользователь сможет исправить публикацию и отправить её на модерацию повторно."
          confirmText="Отклонить"
          cancelText="Отмена"
          variant="warning"
          onConfirm={() => {
            if (confirmReject.postId) rejectPost(confirmReject.postId);
            setConfirmReject({ open: false, postId: null });
            setRejectReason('');
          }}
          onClose={() => {
            setConfirmReject({ open: false, postId: null });
            setRejectReason('');
          }}
          reasonLabel="Причина отклонения (увидит пользователь)"
          reasonPlaceholder="Например: исправьте описание / уберите запрещенные элементы"
          reasonValue={rejectReason}
          onReasonChange={setRejectReason}
        />
        <ConfirmModal
          open={confirmDeleteComment.open}
          title="Удаление комментария"
          message="Вы уверены, что хотите удалить этот комментарий?"
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
          <button className="btn btn-outline" onClick={() => setSelectedPostDetail(null)}>← Назад к списку публикаций</button>
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
                  className="fixed-height-image"
                  style={{ width: '100%' }}
                />
              </div>
              <div className="card-info admin-detail-content">
                <h3 className="card-title admin-detail-title">{post?.post_title}</h3>
                <div className="card-author">
                  <div className="admin-inline-meta">
                    <img src={post?.author?.avatar_url || '/default-avatar.svg'} alt={post?.author?.name || 'Автор'} className="author-avatar" />
                    <span className="author-name">
                      {post?.author ? `${post.author.name} ${post.author.user_surname || ''}`.trim() : 'Неизвестный автор'}
                    </span>
                    <span className="admin-detail-date">• {formatDate(post?.created_at)}</span>
                  </div>
                </div>
                <p className="admin-detail-text">
                  {post?.post_content || ''}
                </p>
                <div className="admin-tags-row">
                  {tags.map((tag, idx) => (
                    <span key={idx} className="admin-tag">#{String(tag).trim()}</span>
                  ))}
                  {post?.category?.name && <span className="admin-tag">Категория: {post.category.name}</span>}
                </div>
                <div className="user-card__actions admin-detail-actions">
                  {isPendingPost && (
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => handlePostAction('approve', post.id)}>
                      Одобрить
                    </button>
                  )}
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => handlePostAction('reject', post.id)}>
                    Отклонить
                  </button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => handlePostAction('delete', post.id)}>
                    Удалить за нарушение
                  </button>
                </div>
                <div className="admin-comments-shell">
                  <div className="admin-comments-title">
                    Комментарии ({selectedPostDetail.comments.length})
                  </div>
                  <div className="admin-comments-list-inline">
                    {selectedPostDetail.comments.map((comment) => {
                      const isDeletedComment = !!comment.deleted_at;
                      return (
                        <div key={comment.id} className={`admin-comment-inline${isDeletedComment ? ' admin-comment-inline--deleted' : ''}`}>
                          <div className="admin-comment-toolbar">
                            <div className="admin-comment-toolbar__meta">
                              <img src={comment.author?.avatar_url || '/default-avatar.svg'} alt={comment.author?.name || 'Автор'} className="author-avatar" />
                              <strong className="admin-comment-author">
                                {comment.author ? `${comment.author.name} ${comment.author.user_surname || ''}`.trim() : 'Неизвестный автор'}
                              </strong>
                              <span className="admin-comment-date">• {formatDate(comment.created_at)}</span>
                            </div>
                            <div className="admin-comment-toolbar__actions">
                              {!isDeletedComment && comment.moderation_status !== 'approved' && (
                                <button type="button" className="btn btn-primary btn-sm" onClick={() => handleCommentAction('approve', comment.id)}>Одобрить</button>
                              )}
                              <button type="button" className="btn btn-danger btn-sm" onClick={() => handleCommentAction('delete', comment.id)}>Удалить</button>
                            </div>
                          </div>
                          <p className="admin-comment-text">
                            {comment.comment_content}
                          </p>
                        </div>
                      );
                    })}
                    {selectedPostDetail.comments.length === 0 && <EmptyState title="Комментарии не найдены" compact />}
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
    <div className="admin-posts">
      <ConfirmModal
        open={confirmDelete.open}
        title="Удаление публикации за нарушение"
        message="Пост будет удален из-за нарушения правил сообщества, пользователь не сможет его исправить. Продолжить?"
        confirmText="Удалить за нарушение"
        cancelText="Отмена"
        variant="danger"
        onConfirm={() => {
          if (confirmDelete.postId) deletePost(confirmDelete.postId);
          setConfirmDelete({ open: false, postId: null });
          setDeleteReason('');
        }}
        onClose={() => {
          setConfirmDelete({ open: false, postId: null });
          setDeleteReason('');
        }}
        reasonLabel="Причина удаления (увидит пользователь)"
        reasonPlaceholder="Например: содержит запрещенный контент / разжигание ненависти"
        reasonValue={deleteReason}
        onReasonChange={setDeleteReason}
      />
      <ConfirmModal
        open={confirmReject.open}
        title="Отклонение публикации"
        message="Пользователь сможет исправить публикацию и отправить её на модерацию повторно."
        confirmText="Отклонить"
        cancelText="Отмена"
        variant="warning"
        onConfirm={() => {
          if (confirmReject.postId) rejectPost(confirmReject.postId);
          setConfirmReject({ open: false, postId: null });
          setRejectReason('');
        }}
        onClose={() => {
          setConfirmReject({ open: false, postId: null });
          setRejectReason('');
        }}
        reasonLabel="Причина отклонения (увидит пользователь)"
        reasonPlaceholder="Например: исправьте описание / уберите запрещенные элементы"
        reasonValue={rejectReason}
        onReasonChange={setRejectReason}
      />
      <div className="admin-section-header">
        <h2>Модерация публикаций</h2>
        
        {/* Сообщения об успехе и ошибках */}
        <Alert type="success" message={successMessage} onClose={() => setSuccessMessage('')} className="admin-alert" />
        <Alert type="error" message={error} onClose={() => setError('')} className="admin-alert" />
        <div className="admin-filters admin-filters--sticky">
          <input
            type="text"
            placeholder="Поиск по заголовку или содержимому..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="admin-search-input"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="pending">На модерации</option>
            <option value="approved">Одобренные</option>
            <option value="rejected">Отклоненные</option>
            <option value="deleted">Удаленные</option>
            <option value="all">Все публикации</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="admin-skeleton-grid">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="admin-skeleton-card">
              <div className="admin-skeleton admin-skeleton--image" />
              <div className="admin-skeleton admin-skeleton--line" />
              <div className="admin-skeleton admin-skeleton--line short" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <>
          <div className="posts-grid">
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onAction={handlePostAction}
              />
            ))}
          </div>

          {posts.length === 0 && (
            <EmptyState
              title="Публикации не найдены"
              text="Попробуйте изменить фильтр или перейти к публикациям на модерации."
              actions={
                <div className="user-card__actions" style={{ justifyContent: 'center' }}>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => { setStatusFilter('pending'); setCurrentPage(1); }}>
                    Перейти в модерацию
                  </button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => { setStatusFilter('all'); setSearchQuery(''); setCurrentPage(1); }}>
                    Сбросить фильтры
                  </button>
                </div>
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

export default AdminPosts;


