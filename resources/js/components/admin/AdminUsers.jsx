import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api';
import { useToast } from '../../contexts/ToastContext';
import UserCard from './UserCard';
import UserDetail from './UserDetail';
import PostCard from './PostCard';
import ConfirmModal from '../modals/ConfirmModal';
import EmptyState from '../common/EmptyState';
import Alert from '../common/Alert';
import MediaPreview from '../common/MediaPreview';

function AdminUsers() {
  const toast = useToast().toast;
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [successMessage, setSuccessMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState({ open: false, userId: null });
  const [confirmRestore, setConfirmRestore] = useState({ open: false, userId: null });
  const [userPostsMode, setUserPostsMode] = useState(false);
  const [postsUser, setPostsUser] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [userPostsLoading, setUserPostsLoading] = useState(false);
  const [postDetail, setPostDetail] = useState(null);
  const [postDetailLoading, setPostDetailLoading] = useState(false);
  const [confirmDeletePost, setConfirmDeletePost] = useState({ open: false, postId: null });
  const [confirmDeleteComment, setConfirmDeleteComment] = useState({ open: false, commentId: null });
  const [confirmBan, setConfirmBan] = useState({ open: false, userId: null });
  const [confirmUnban, setConfirmUnban] = useState({ open: false, userId: null });
  const [banReason, setBanReason] = useState('');
  const [banLoading, setBanLoading] = useState(false);
  const [unbanLoading, setUnbanLoading] = useState(false);

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
    fetchUsers();
  }, [statusFilter, searchQuery, currentPage]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchQuery && { search: searchQuery }),
      });

      const response = await apiFetch(`/api/admin/users?${params}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.data || []);
        setTotalPages(data.last_page || 1);
      } else {
        const msg = 'Не удалось загрузить список пользователей. Попробуйте позже.';
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

  const handleUserAction = (action, userId) => {
    if (action === 'view') {
      fetchUserDetail(userId);
    } else if (action === 'delete') {
      setConfirmDelete({ open: true, userId });
    } else if (action === 'restore') {
      setConfirmRestore({ open: true, userId });
    } else if (action === 'ban') {
      setBanReason('');
      setConfirmBan({ open: true, userId });
    } else if (action === 'unban') {
      setConfirmUnban({ open: true, userId });
    }
  };

  const fetchUserDetail = async (userId) => {
    try {
      const response = await apiFetch(`/api/admin/users/${userId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const user = await response.json();
        setSelectedUser(user);
      }
    } catch (error) {
      // Ошибка при загрузке деталей пользователя
    }
  };

  const deleteUser = async (userId) => {
    try {
      const response = await apiFetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const msg = 'Пользователь успешно удалён';
        setSuccessMessage(msg);
        toast.success(msg);
        fetchUsers();
        if (selectedUser && selectedUser.id === userId) {
          setSelectedUser(null);
        }
      } else {
        const msg = 'Не удалось удалить пользователя';
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = 'Ошибка соединения с сервером';
      setError(msg);
      toast.error(msg);
    }
  };

  const restoreUser = async (userId) => {
    try {
      const response = await apiFetch(`/api/admin/users/${userId}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const msg = 'Пользователь успешно восстановлен';
        setSuccessMessage(msg);
        toast.success(msg);
        fetchUsers();
        if (selectedUser && selectedUser.id === userId) {
          setSelectedUser(null);
        }
      } else {
        const msg = 'Не удалось восстановить пользователя';
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = 'Ошибка соединения с сервером';
      setError(msg);
      toast.error(msg);
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
        const data = await response.json();
        const msg = 'Пользователь заблокирован';
        setSuccessMessage(msg);
        toast.success(msg);
        setConfirmBan({ open: false, userId: null });
        setBanReason('');
        fetchUsers();
        if (selectedUser && selectedUser.id === userId && data.user) {
          setSelectedUser(data.user);
        }
      } else {
        const data = await response.json().catch(() => ({}));
        const validationMsg = data.errors?.ban_reason?.[0];
        const msg = validationMsg || data.message || 'Не удалось заблокировать пользователя';
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = 'Ошибка соединения с сервером';
      setError(msg);
      toast.error(msg);
    } finally {
      setBanLoading(false);
    }
  };

  const unbanUser = async (userId) => {
    setUnbanLoading(true);
    try {
      const response = await apiFetch(`/api/admin/users/${userId}/unban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const msg = 'Пользователь разблокирован';
        setSuccessMessage(msg);
        toast.success(msg);
        fetchUsers();
        if (selectedUser && selectedUser.id === userId && data.user) {
          setSelectedUser(data.user);
        }
      } else {
        const data = await response.json().catch(() => ({}));
        const msg = data.message || 'Не удалось разблокировать пользователя';
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = 'Ошибка соединения с сервером';
      setError(msg);
      toast.error(msg);
    } finally {
      setUnbanLoading(false);
      setConfirmUnban({ open: false, userId: null });
    }
  };

  const fetchUserPosts = async (user) => {
    try {
      setUserPostsLoading(true);
      const params = new URLSearchParams({
        user_id: user.id,
        per_page: 100,
      });
      const response = await apiFetch(`/api/admin/posts?${params}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPostsUser(user);
        setUserPosts(data.data || []);
        setUserPostsMode(true);
      } else {
        const msg = 'Не удалось загрузить публикации пользователя';
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = 'Ошибка соединения с сервером';
      setError(msg);
      toast.error(msg);
    } finally {
      setUserPostsLoading(false);
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
        setPostDetail({
          post: data.post,
          comments: data.comments || [],
        });
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
      });

      if (response.ok) {
        const msg = 'Публикация успешно удалена';
        setSuccessMessage(msg);
        toast.success(msg);
        if (postDetail?.post?.id === postId) {
          setPostDetail(null);
        }
        if (postsUser) {
          fetchUserPosts(postsUser);
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
        if (postDetail?.post?.id === postId) {
          fetchPostDetail(postId);
        }
        if (postsUser) {
          fetchUserPosts(postsUser);
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
        if (postDetail?.post?.id) {
          fetchPostDetail(postDetail.post.id);
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
        if (postDetail?.post?.id) {
          fetchPostDetail(postDetail.post.id);
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

  const handlePostAction = (action, postId) => {
    if (action === 'view') {
      fetchPostDetail(postId);
    } else if (action === 'delete') {
      setConfirmDeletePost({ open: true, postId });
    } else if (action === 'approve') {
      approvePost(postId);
    }
  };

  const handlePostCommentAction = (action, commentId) => {
    if (action === 'delete') {
      setConfirmDeleteComment({ open: true, commentId });
    } else if (action === 'approve') {
      approveComment(commentId);
    }
  };


  if (postDetail) {
    const post = postDetail.post;
    const tags = getPostTags(post?.tags);
    const isPendingPost = post?.moderation_status !== 'approved';
    return (
      <div className="admin-users">
        <ConfirmModal
          open={confirmDeletePost.open}
          title="Удаление публикации"
          message="Вы уверены, что хотите удалить эту публикацию?"
          confirmText="Удалить"
          cancelText="Отмена"
          variant="danger"
          onConfirm={() => {
            if (confirmDeletePost.postId) deletePost(confirmDeletePost.postId);
            setConfirmDeletePost({ open: false, postId: null });
          }}
          onClose={() => setConfirmDeletePost({ open: false, postId: null })}
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
          <button className="btn btn-outline" onClick={() => setPostDetail(null)}>← Назад к публикациям пользователя</button>
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
                    <img
                      src={post?.author?.avatar_url || '/default-avatar.svg'}
                      alt={post?.author?.name || 'Автор'}
                      className="author-avatar"
                    />
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
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => handlePostAction('delete', post.id)}>
                    Удалить
                  </button>
                </div>

                <div className="admin-comments-shell">
                  <div className="admin-comments-title">
                    Комментарии ({postDetail.comments.length})
                  </div>
                  <div className="admin-comments-list-inline">
                    {postDetail.comments.map((comment) => {
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
                                <button type="button" className="btn btn-primary btn-sm" onClick={() => handlePostCommentAction('approve', comment.id)}>Одобрить</button>
                              )}
                              <button type="button" className="btn btn-danger btn-sm" onClick={() => handlePostCommentAction('delete', comment.id)}>Удалить</button>
                            </div>
                          </div>
                          <p className="admin-comment-text">
                            {comment.comment_content}
                          </p>
                        </div>
                      );
                    })}
                    {postDetail.comments.length === 0 && <EmptyState title="Комментарии не найдены" compact />}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (userPostsMode && postsUser) {
    return (
      <div className="admin-users">
        <ConfirmModal
          open={confirmDeletePost.open}
          title="Удаление публикации"
          message="Вы уверены, что хотите удалить эту публикацию?"
          confirmText="Удалить"
          cancelText="Отмена"
          variant="danger"
          onConfirm={() => {
            if (confirmDeletePost.postId) deletePost(confirmDeletePost.postId);
            setConfirmDeletePost({ open: false, postId: null });
          }}
          onClose={() => setConfirmDeletePost({ open: false, postId: null })}
        />
        <div className="user-detail__header">
          <button className="btn btn-outline" onClick={() => setUserPostsMode(false)}>← Назад к пользователю</button>
          <h2>Публикации пользователя {postsUser.name} {postsUser.user_surname}</h2>
        </div>
        {userPostsLoading ? (
          <div className="loading">Загрузка публикаций...</div>
        ) : (
          <>
            <div className="posts-grid">
              {userPosts.map((post) => (
                <PostCard key={post.id} post={post} onAction={handlePostAction} />
              ))}
            </div>
            {userPosts.length === 0 && (
              <EmptyState
                title="Публикации пользователя не найдены"
                text="Проверьте очередь модерации, возможно публикации еще не одобрены."
                actions={<button className="admin-btn admin-btn-primary admin-btn-sm" onClick={() => { setUserPostsMode(false); }}>Вернуться к пользователю</button>}
              />
            )}
          </>
        )}
      </div>
    );
  }

  if (selectedUser) {
    return (
      <>
        <ConfirmModal
          open={confirmDelete.open}
          title="Удаление пользователя"
          message="Вы уверены, что хотите удалить этого пользователя? Все его публикации и связанные данные также будут удалены."
          confirmText="Удалить"
          cancelText="Отмена"
          variant="danger"
          onConfirm={() => {
            if (confirmDelete.userId) deleteUser(confirmDelete.userId);
            setConfirmDelete({ open: false, userId: null });
          }}
          onClose={() => setConfirmDelete({ open: false, userId: null })}
        />
        <ConfirmModal
          open={confirmRestore.open}
          title="Восстановление пользователя"
          message="Вы уверены, что хотите восстановить этого пользователя? Он снова сможет входить в систему и пользоваться платформой."
          confirmText="Восстановить"
          cancelText="Отмена"
          variant="primary"
          onConfirm={() => {
            if (confirmRestore.userId) restoreUser(confirmRestore.userId);
            setConfirmRestore({ open: false, userId: null });
          }}
          onClose={() => setConfirmRestore({ open: false, userId: null })}
        />
        <ConfirmModal
          open={confirmBan.open}
          title="Блокировка пользователя"
          message="Укажите причину блокировки. Пользователь не сможет публиковать, комментировать и выполнять социальные действия."
          confirmText="Заблокировать"
          cancelText="Отмена"
          variant="danger"
          isLoading={banLoading}
          reasonLabel="Причина блокировки *"
          reasonPlaceholder="Например: нарушение правил сообщества"
          reasonValue={banReason}
          onReasonChange={setBanReason}
          onConfirm={() => {
            if (confirmBan.userId) banUser(confirmBan.userId, banReason);
          }}
          onClose={() => {
            if (!banLoading) {
              setConfirmBan({ open: false, userId: null });
              setBanReason('');
            }
          }}
        />
        <ConfirmModal
          open={confirmUnban.open}
          title="Разблокировка пользователя"
          message="Вы уверены, что хотите разблокировать этого пользователя? Он снова сможет публиковать, комментировать и выполнять социальные действия на платформе."
          confirmText="Разблокировать"
          cancelText="Отмена"
          variant="primary"
          isLoading={unbanLoading}
          onConfirm={() => {
            if (confirmUnban.userId) unbanUser(confirmUnban.userId);
          }}
          onClose={() => {
            if (!unbanLoading) {
              setConfirmUnban({ open: false, userId: null });
            }
          }}
        />
        <UserDetail
          user={selectedUser}
          onBack={() => setSelectedUser(null)}
          onUserAction={handleUserAction}
          onShowUserPosts={(user) => fetchUserPosts(user)}
        />
      </>
    );
  }

  return (
    <div className="admin-users">
      <ConfirmModal
        open={confirmDelete.open}
        title="Удаление пользователя"
        message="Вы уверены, что хотите удалить этого пользователя? Все его публикации и связанные данные также будут удалены."
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
        onConfirm={() => {
          if (confirmDelete.userId) deleteUser(confirmDelete.userId);
          setConfirmDelete({ open: false, userId: null });
        }}
        onClose={() => setConfirmDelete({ open: false, userId: null })}
      />
      <ConfirmModal
        open={confirmRestore.open}
        title="Восстановление пользователя"
        message="Вы уверены, что хотите восстановить этого пользователя? Он снова сможет входить в систему и пользоваться платформой."
        confirmText="Восстановить"
        cancelText="Отмена"
        variant="primary"
        onConfirm={() => {
          if (confirmRestore.userId) restoreUser(confirmRestore.userId);
          setConfirmRestore({ open: false, userId: null });
        }}
        onClose={() => setConfirmRestore({ open: false, userId: null })}
      />
      <ConfirmModal
        open={confirmBan.open}
        title="Блокировка пользователя"
        message="Укажите причину блокировки. Пользователь не сможет публиковать, комментировать и выполнять социальные действия."
        confirmText="Заблокировать"
        cancelText="Отмена"
        variant="danger"
        isLoading={banLoading}
        reasonLabel="Причина блокировки *"
        reasonPlaceholder="Например: нарушение правил сообщества"
        reasonValue={banReason}
        onReasonChange={setBanReason}
        onConfirm={() => {
          if (confirmBan.userId) banUser(confirmBan.userId, banReason);
        }}
        onClose={() => {
          if (!banLoading) {
            setConfirmBan({ open: false, userId: null });
            setBanReason('');
          }
        }}
      />
      <ConfirmModal
        open={confirmUnban.open}
        title="Разблокировка пользователя"
        message="Вы уверены, что хотите разблокировать этого пользователя? Он снова сможет публиковать, комментировать и выполнять социальные действия на платформе."
        confirmText="Разблокировать"
        cancelText="Отмена"
        variant="primary"
        isLoading={unbanLoading}
        onConfirm={() => {
          if (confirmUnban.userId) unbanUser(confirmUnban.userId);
        }}
        onClose={() => {
          if (!unbanLoading) {
            setConfirmUnban({ open: false, userId: null });
          }
        }}
      />
      <div className="admin-section-header">
        <h2>Управление пользователями</h2>
        
        {/* Сообщения об успехе и ошибках */}
        <Alert type="success" message={successMessage} onClose={() => setSuccessMessage('')} className="admin-alert" />
        <Alert type="error" message={error} onClose={() => setError('')} className="admin-alert" />
        <div className="admin-filters admin-filters--sticky">
          <input
            type="text"
            placeholder="Поиск по имени, email или username..."
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
            <option value="all">Все пользователи</option>
            <option value="active">Активные</option>
            <option value="deleted">Удаленные</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="admin-skeleton-grid">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="admin-skeleton-card">
              <div className="admin-skeleton admin-skeleton--line" />
              <div className="admin-skeleton admin-skeleton--line short" />
              <div className="admin-skeleton admin-skeleton--line" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <>
          <div className="users-grid">
            {users.map(user => (
              <UserCard
                key={user.id}
                user={user}
                onAction={handleUserAction}
              />
            ))}
          </div>

          {users.length === 0 && (
            <EmptyState
              title="Пользователи не найдены"
              text="Попробуйте изменить условия поиска или сбросить фильтры."
              actions={<button className="admin-btn admin-btn-outline admin-btn-sm" onClick={() => { setStatusFilter('all'); setSearchQuery(''); setCurrentPage(1); }}>Сбросить фильтры</button>}
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

export default AdminUsers;


