import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useGoBack } from '../hooks/useGoBack';
import { getReturnState } from '../utils/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { apiFetch } from '../api';
import EditPostModal from './modals/EditPostModal';
import DeletePostModal from './modals/DeletePostModal';
import LoginModal from './modals/LoginModal';
import RegisterModal from './modals/RegisterModal';
import CommentRulesAcceptModal from './modals/CommentRulesAcceptModal';
import EmptyState from './common/EmptyState';
import Alert from './common/Alert';
import MediaPreview from './common/MediaPreview';
import MasonryGrid from './common/MasonryGrid';
import MasonryRecommendationCard from './MasonryRecommendationCard';
import CommentActionsMenu from './common/CommentActionsMenu';
import '../../css/app.css';

function PostDetail() {
  const COMMENT_COOLDOWN_MS = 10000;
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const goBack = useGoBack('/');
  const postLinkState = getReturnState(location);
  const { isAuthenticated, user, acceptCommentRules } = useAuth();
  const toast = useToast().toast;
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [error, setError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSaveErrors, setEditSaveErrors] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [nextCommentAllowedAt, setNextCommentAllowedAt] = useState(0);
  const [commentsSort, setCommentsSort] = useState('new');
  const [recommendations, setRecommendations] = useState([]);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showCommentRulesModal, setShowCommentRulesModal] = useState(false);
  const [isAcceptingCommentRules, setIsAcceptingCommentRules] = useState(false);
  const isCommentCooldownActive = Date.now() < nextCommentAllowedAt;
  const hasAcceptedCommentRules = Boolean(user?.comment_rules_accepted_at);

  // Проверяем, является ли текущий пользователь автором поста
  const isOwnPost = post && user && post.author?.id === user.id;
  /** Отклонённая модерацией публикация: без ленты соц.действий, комментариев и рекомендаций */
  const isRejectedUnpublished = post?.moderation_status === 'rejected';
  const isApprovedPublished = !!post
    && !post.is_draft
    && post.moderation_status === 'approved'
    && (!post.published_at || new Date(post.published_at) <= new Date());

  const lockPublishSettings = !!post
    && !post.is_draft
    && post.moderation_status === 'approved';

  const commentsSortInitialized = useRef(false);

  const handleLike = async () => {
    if (!isAuthenticated) return setShowLoginModal(true);
    try {
      const response = await apiFetch(`/api/posts/${id}/like`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        const result = await response.json();
        const liked = !!result.liked;
        setIsLiked(liked);
        // Используем актуальный счетчик из ответа сервера
        if (result.like_count !== undefined) {
          setLikes(result.like_count);
        } else {
          // Fallback на старую логику если сервер не вернул счетчик
          setLikes(prev => liked ? prev + (isLiked ? 0 : 1) : prev - (isLiked ? 1 : 0));
        }
        setError('');
      } else {
        const msg = 'Не удалось поставить лайк. Попробуйте позже.';
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = 'Ошибка соединения с сервером';
      setError(msg);
      toast.error(msg);
    }
  };

  const handleFavorite = async () => {
    if (!isAuthenticated) return setShowLoginModal(true);
    const prev = isFavorited;
    setIsFavorited(!prev);
    try {
      const response = await apiFetch(`/api/posts/${id}/favorite`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        const result = await response.json();
        setIsFavorited(!!result.is_favorited);
      } else {
        setIsFavorited(prev);
        toast.error('Не удалось изменить избранное');
      }
    } catch {
      setIsFavorited(prev);
      toast.error('Ошибка соединения');
    }
  };

  const handleCommentLike = async (commentId) => {
    if (!isAuthenticated) return setShowLoginModal(true);
    const comment = comments.find((c) => c.id === commentId);
    if (!comment) return;
    const prevLiked = comment.is_liked;
    const prevCount = comment.likes_count;
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, is_liked: !prevLiked, likes_count: prevCount + (prevLiked ? -1 : 1) } : c));
    try {
      const res = await apiFetch(`/api/comments/${commentId}/like`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setComments(prev => prev.map(c => c.id === commentId ? { ...c, is_liked: !!data.liked, likes_count: data.likes_count ?? c.likes_count } : c));
      } else {
        setComments(prev => prev.map(c => c.id === commentId ? { ...c, is_liked: prevLiked, likes_count: prevCount } : c));
        toast.error('Не удалось поставить лайк');
      }
    } catch {
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, is_liked: prevLiked, likes_count: prevCount } : c));
      toast.error('Ошибка соединения');
    }
  };

  const submitComment = async () => {
    const now = Date.now();
    if (now < nextCommentAllowedAt) {
      const secondsLeft = Math.ceil((nextCommentAllowedAt - now) / 1000);
      const msg = `Комментарий можно отправить через ${secondsLeft} сек.`;
      setError(msg);
      toast.error(msg);
      return;
    }

    setIsCommentSubmitting(true);

    try {
      const response = await apiFetch(`/api/posts/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ content: newComment }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        const createdComment = data?.comment;

        if (createdComment?.id && createdComment?.auto_moderation_passed === true) {
          const commentForState = {
            id: createdComment.id,
            author: createdComment.author
              ? `${createdComment.author.name || ''} ${createdComment.author.surname || ''}`.trim() || 'Неизвестный автор'
              : 'Неизвестный автор',
            avatar: createdComment.author?.avatar || user?.avatar_url || user?.avatar || '/default-avatar.svg',
            text: createdComment.content || newComment,
            createdAt: createdComment.created_at || new Date().toISOString(),
            likes_count: 0,
            is_liked: false,
          };

          setComments((prev) => (commentsSort === 'popular' ? [...prev, commentForState] : [commentForState, ...prev]));
        }

        setNewComment('');
        setError('');
        setNextCommentAllowedAt(Date.now() + COMMENT_COOLDOWN_MS);
        toast.success(data?.message || 'Комментарий отправлен');
      } else if (response.status === 403 && data?.code === 'comment_rules_not_accepted') {
        setShowCommentRulesModal(true);
        toast.error(data?.message || 'Примите правила комментариев');
      } else {
        const msg = data?.message || 'Не удалось отправить комментарий. Попробуйте позже.';
        setError(msg);
        toast.error(msg);
      }
    } catch {
      const msg = 'Ошибка соединения с сервером';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) return setShowLoginModal(true);
    if (!newComment.trim()) return;
    if (isCommentSubmitting) return;

    if (!hasAcceptedCommentRules) {
      setShowCommentRulesModal(true);
      return;
    }

    await submitComment();
  };

  const handleAcceptCommentRules = async () => {
    setIsAcceptingCommentRules(true);
    const result = await acceptCommentRules();
    if (result.success) {
      setShowCommentRulesModal(false);
      if (newComment.trim()) {
        await submitComment();
      }
    } else {
      toast.error(result.error || 'Не удалось сохранить согласие');
    }
    setIsAcceptingCommentRules(false);
  };

  const mapComments = React.useCallback((postData) => (postData.comments || []).map(comment => ({
    id: comment.id,
    userId: comment.user_id,
    author: comment.author ? `${comment.author.name} ${comment.author.user_surname || ''}`.trim() : 'Неизвестный автор',
    avatar: comment.author?.avatar_url || comment.author?.avatar || '/default-avatar.svg',
    text: comment.hidden_notice || comment.comment_content || '',
    isHidden: Boolean(comment.is_hidden || comment.hidden_notice),
    createdAt: comment.created_at,
    likes_count: comment.likes_count ?? 0,
    is_liked: !!comment.is_liked,
  })), []);

  const fetchPostData = React.useCallback(async (sort, { commentsOnly = false } = {}) => {
    if (!id) return setIsLoading(false);
    if (!commentsOnly) setIsLoading(true);
    try {
      const response = await apiFetch(`/api/posts/${id}?comments_sort=${sort}`, { headers: { 'Accept': 'application/json' } });
      if (response.ok) {
        const postData = await response.json();
        if (commentsOnly) {
          setComments(mapComments(postData));
        } else {
          setPost(postData);
          setLikes(postData.like_count || 0);
          setIsLiked(!!postData.liked);
          setIsFavorited(!!postData.is_favorited);
          setComments(mapComments(postData));
        }
      } else if (!commentsOnly) {
        setPost(null);
      }
    } catch (error) {
      console.error('Error loading post:', error);
      if (!commentsOnly) setPost(null);
    } finally {
      if (!commentsOnly) setIsLoading(false);
    }
  }, [id, mapComments]);

  // Рекомендации «Вам может понравиться» (критерий 3.9) — не для отклонённых публикаций
  useEffect(() => {
    if (!id || !post || post.moderation_status === 'rejected') {
      setRecommendations([]);
      return;
    }
    apiFetch(`/api/recommendations?post_id=${id}`, { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setRecommendations(Array.isArray(data) ? data : []))
      .catch(() => setRecommendations([]));
  }, [id, post?.id, post?.moderation_status]);

  useEffect(() => {
    commentsSortInitialized.current = false;
    fetchPostData(commentsSort);
  }, [id, fetchPostData]);

  useEffect(() => {
    if (!commentsSortInitialized.current) {
      commentsSortInitialized.current = true;
      return;
    }
    if (post) {
      fetchPostData(commentsSort, { commentsOnly: true });
    }
  }, [commentsSort, post, fetchPostData]);

  // Обработка сохранения изменений
  const handleSaveEdit = async (formData) => {
    setIsSaving(true);
    setError('');
    
    try {
      const response = await apiFetch(`/api/posts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          tags: formData.tags,
          ...(formData.category_id ? { category_id: Number(formData.category_id) } : {}),
          ...(!lockPublishSettings && typeof formData.is_draft === 'boolean' ? { is_draft: formData.is_draft } : {}),
          ...(!lockPublishSettings && !formData.is_draft ? { published_at: formData.publish_mode === 'schedule' && formData.published_at ? new Date(formData.published_at).toISOString() : null } : {})
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Не удалось сохранить изменения';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
          if (response.status === 422 && errorData.errors && typeof errorData.errors === 'object') {
            setEditSaveErrors(errorData.errors);
          }
        } catch (e) {
          // ignore
        }
        throw new Error(errorMessage);
      }
      setEditSaveErrors({});

      // Перезагружаем пост для получения актуальных данных
      const reloadResponse = await apiFetch(`/api/posts/${id}`, { headers: { 'Accept': 'application/json' } });
      if (reloadResponse.ok) {
        const postData = await reloadResponse.json();
        setPost(postData);
      }
      
      setShowEditModal(false);
      setError('');
      setEditSaveErrors({});
    } catch (e) {
      const msg = e.message || 'Ошибка сохранения изменений';
      setError(msg);
      toast.error(msg);
      throw e;
    } finally {
      setIsSaving(false);
    }
  };

  // Обработка удаления поста
  const handleDeletePost = async () => {
    setIsDeleting(true);
    setError('');
    
    try {
      const response = await apiFetch(`/api/posts/${id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Не удалось удалить публикацию';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // ignore
        }
        throw new Error(errorMessage);
      }

      goBack();
    } catch (e) {
      const msg = e.message || 'Ошибка удаления публикации';
      setError(msg);
      toast.error(msg);
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    setError('');
    try {
      const response = await apiFetch(`/api/posts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ is_draft: false }),
      });
      if (!response.ok) {
        const errText = await response.text();
        let msg = 'Не удалось опубликовать';
        try { const d = JSON.parse(errText); msg = d.message || msg; } catch (_) {}
        throw new Error(msg);
      }
      toast.success('Публикация опубликована');
      await loadPost();
    } catch (e) {
      const msg = e.message || 'Ошибка публикации';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading) return <div className="main-content"><div className="loading-state">Загрузка...</div></div>;
  if (!post) {
    return (
      <div className="main-content">
        <EmptyState
          title="Работа не найдена"
          text="Публикация могла быть удалена или перемещена."
          actions={<button className="btn btn-primary" onClick={() => navigate('/')}>На главную</button>}
        />
      </div>
    );
  }

  return (
    <div className="main-content post-detail-shell">
      <div className="post-detail-card">
        {/* Кнопка закрытия */}
        <button
          onClick={goBack}
          aria-label="Назад"
          title="Назад"
          className="ui-icon-btn"
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            zIndex: 10,
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 'bold'
          }}
        >
          ×
        </button>

      <div className="post-detail-grid">
        {/* Левая часть - изображение */}
        <div className="post-detail-media-col">
          <MediaPreview
            src={post.image_url || post.media_path}
            mediaType={post.media_type}
            alt={post.post_title}
            style={{
              maxWidth: '100%',
              maxHeight: '600px',
              borderRadius: '8px',
              objectFit: 'contain',
              cursor: post.media_type === 'video' ? 'default' : 'pointer'
            }}
          />
        </div>

        {/* Правая часть - информация */}
        <div className="post-detail-info-col">
          {post.is_draft && (
            <div className="post-state-badge">
              Черновик
            </div>
          )}
          {!post.is_draft && post.published_at && new Date(post.published_at) > new Date() && (
            <div className="post-state-badge">
              Запланировано на {new Date(post.published_at).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
            </div>
          )}
          {post.moderation_status === 'rejected' && (
            <div className="post-rejected-box">
              <div className="post-rejected-title">Публикация отклонена модерацией</div>
              <div className="post-rejected-label">Причина:</div>
              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {(post.moderation_rejection_reason && String(post.moderation_rejection_reason).trim()) || 'Нарушает правила сообщества.'}
              </div>
            </div>
          )}
          <div className="post-author-block">
            {isAuthenticated && post.author?.id ? (
              <Link
                to={`/profile/${post.author.id}`}
                state={{ from: location.pathname }}
                className="post-author-link"
              >
                <img
                  src={post.author?.avatar_url || post.author?.avatar || '/default-avatar.svg'}
                  alt={post.author?.name || 'Автор'}
                  className="post-author-avatar"
                  onError={(e) => {
                    e.target.src = '/default-avatar.svg';
                  }}
                />
                <div>
                  <div style={{
                    fontWeight: '600',
                    color: '#7B0000',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '0.9rem'
                  }}>
                    {post.author?.name ? `${post.author.name} ${post.author.user_surname || ''}`.trim() : 'Неизвестный автор'}
                  </div>
                </div>
              </Link>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <img
                  src={post.author?.avatar_url || post.author?.avatar || '/default-avatar.svg'}
                  alt={post.author?.name || 'Автор'}
                  className="post-author-avatar"
                  onError={(e) => {
                    e.target.src = '/default-avatar.svg';
                  }}
                />
                <div>
                  <div style={{
                    fontWeight: '600',
                    color: '#7B0000',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '0.9rem'
                  }}>
                    {post.author?.name ? `${post.author.name} ${post.author.user_surname || ''}`.trim() : 'Неизвестный автор'}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="post-detail-title-row">
            <h2 className="post-detail-title">
              {post.post_title}
            </h2>
            {isOwnPost && (
              <div className="post-detail-actions">
                {post.is_draft ? (
                  <>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="btn btn-danger btn-sm"
                    >
                      Удалить
                    </button>
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="btn btn-outline btn-sm"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={handlePublish}
                      disabled={isPublishing}
                      className="btn btn-primary btn-sm"
                      style={{ opacity: isPublishing ? 0.7 : 1 }}
                    >
                      {isPublishing ? 'Публикация…' : 'Опубликовать'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="btn btn-outline btn-sm"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="btn btn-danger btn-sm"
                    >
                      Удалить
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="post-detail-meta">
            {new Date(post.created_at).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
            {(typeof post.category === 'string' ? post.category : post.category?.name) && (
              <span className="post-detail-category">· {typeof post.category === 'string' ? post.category : post.category?.name}</span>
            )}
          </div>

          {post.post_content_html != null ? (
            <div
              className="post-content-html post-detail-content"
              dangerouslySetInnerHTML={{ __html: post.post_content_html || '' }}
            />
          ) : (
            <p className="post-detail-content">
              {post.post_content}
            </p>
          )}

          {/* Теги */}
          {post.tags && post.tags.length > 0 && (
            <div className="post-detail-tags">
              {(Array.isArray(post.tags) ? post.tags : post.tags.split(',')).map((tag, index) => (
                <span
                  key={index}
                  className="post-detail-tag"
                >
                  #{typeof tag === 'string' ? tag.trim() : tag}
                </span>
              ))}
            </div>
          )}

          {isApprovedPublished && !isRejectedUnpublished && (
          <div className="post-detail-social-row">
            <button
              onClick={handleLike}
              className="ui-inline-action"
              style={{
                color: isLiked ? '#7B0000' : '#6b7280',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.9rem',
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>{isLiked ? '❤️' : '🤍'}</span>
              {isLiked ? 'Нравится' : 'Нравится'} ({likes})
            </button>
            <button
              onClick={handleFavorite}
              className="ui-inline-action"
              style={{
                color: isFavorited ? '#7B0000' : '#6b7280',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.9rem',
              }}
              title={isFavorited ? 'Убрать из избранного' : 'В избранное'}
            >
              <span style={{ fontSize: '1.2rem' }}>{isFavorited ? '🔖' : '📑'}</span>
              {isFavorited ? 'В избранном' : 'В избранное'}
            </button>
            <div className="post-detail-comments-count">
              Комментарии: {comments.length}
            </div>
          </div>
          )}

          {/* Комментарии — только для опубликованных и не отклонённых постов */}
          {isApprovedPublished && !isRejectedUnpublished && (
          <div className="post-comments-wrap">
            {/* Сообщение об ошибке */}
            <Alert type="error" message={error} onClose={() => setError('')} />

            <CommentRulesAcceptModal
              open={showCommentRulesModal}
              onAccept={handleAcceptCommentRules}
              onClose={() => setShowCommentRulesModal(false)}
              isLoading={isAcceptingCommentRules}
            />

            <form onSubmit={handleComment} className="post-comment-form">
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem' }}>
                <Link to="/community-rules" style={{ color: '#6b7280', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                  Правила комментариев
                </Link>
              </p>
              <div className="post-comment-input-row">
                <img 
                  src={user?.avatar_url || user?.avatar || '/default-avatar.svg'}
                  alt="Вы"
                  className="post-avatar-sm"
                  onError={(e) => {
                    e.target.src = '/default-avatar.svg';
                  }}
                />
                <input 
                  type="text"
                  value={newComment} 
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Оставить комментарий..."
                  className="post-comment-input"
                />
                <button 
                  type="submit"
                  disabled={isCommentSubmitting || isCommentCooldownActive}
                  className="post-comment-submit"
                >
                  →
                </button>
              </div>
      </form>

            <div className="profile-tabs" style={{ marginBottom: '0.75rem' }}>
              <span className="ui-form-help" style={{ marginTop: 0 }}>Сортировка:</span>
              <button
                type="button"
                onClick={() => setCommentsSort('new')}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '8px',
                  border: commentsSort === 'new' ? '2px solid #7B0000' : '1px solid #D4D1CC',
                  background: commentsSort === 'new' ? 'rgba(123, 0, 0, 0.08)' : '#DEDDD8',
                  color: commentsSort === 'new' ? '#7B0000' : '#111827',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Сначала новые
              </button>
              <button
                type="button"
                onClick={() => setCommentsSort('popular')}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '8px',
                  border: commentsSort === 'popular' ? '2px solid #7B0000' : '1px solid #D4D1CC',
                  background: commentsSort === 'popular' ? 'rgba(123, 0, 0, 0.08)' : '#DEDDD8',
                  color: commentsSort === 'popular' ? '#7B0000' : '#111827',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                По популярности
              </button>
            </div>

            <div className="post-comments-list">
      {comments.map(c => (
                <div 
                  key={c.id}
                  className="post-comment-item"
                >
                  <img 
                    src={c.avatar} 
                    alt={c.author}
                    className="post-avatar-sm"
                    onError={(e) => {
                      e.target.src = '/default-avatar.svg';
                    }}
                  />
                  <div className="post-comment-body">
                    <div className="post-comment-author-row">
                      <strong className="post-comment-author">
                        {c.author}
                      </strong>
                      <CommentActionsMenu
                        commentId={c.id}
                        authorUserId={c.userId}
                        isHidden={c.isHidden}
                        onReported={(msg) => toast.success(msg || 'Жалоба отправлена. Комментарий будет проверен модератором.')}
                        onLoginRequired={() => setShowLoginModal(true)}
                      />
                    </div>
                    <p className="post-comment-text" style={c.isHidden ? { color: '#6b7280', fontStyle: 'italic' } : undefined}>
                      {c.text}
                    </p>
                    {isAuthenticated && !c.isHidden && (
                      <button
                        type="button"
                        onClick={() => handleCommentLike(c.id)}
                        className="ui-inline-action"
                        style={{
                          marginTop: '0.35rem',
                          padding: '0.2rem 0.35rem',
                          fontSize: '0.75rem',
                          color: c.is_liked ? '#7B0000' : '#6b7280',
                          fontFamily: 'JetBrains Mono, monospace'
                        }}
                        title={c.is_liked ? 'Убрать лайк' : 'Нравится'}
                      >
                        {c.is_liked ? '❤️' : '🤍'} {c.likes_count ?? 0}
                      </button>
                    )}
                    {!isAuthenticated && (c.likes_count ?? 0) > 0 && (
                      <span style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }}>
                        🤍 {c.likes_count}
                      </span>
                    )}
                  </div>
        </div>
      ))}

              {comments.length === 0 && (
                <EmptyState title="Комментариев пока нет" text="Будьте первым, кто оставит комментарий." compact />
              )}
            </div>
          </div>
          )}
        </div>
      </div>
      </div>

      {/* Вам может понравиться — только для опубликованных работ */}
      {!isRejectedUnpublished && recommendations.length > 0 && (
        <div className="post-recommend-wrap">
          <h2 className="post-recommend-title">Вам может понравиться</h2>
          <MasonryGrid>
            {recommendations.map((rec) => (
              <MasonryRecommendationCard key={rec.id} post={rec} linkState={postLinkState} />
            ))}
          </MasonryGrid>
        </div>
      )}

      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLogin={() => setShowLoginModal(false)}
          onSwitchToRegister={() => {
            setShowLoginModal(false);
            setShowRegisterModal(true);
          }}
        />
      )}
      {showRegisterModal && (
        <RegisterModal
          onClose={() => setShowRegisterModal(false)}
          onRegister={() => setShowRegisterModal(false)}
          onSwitchToLogin={() => {
            setShowRegisterModal(false);
            setShowLoginModal(true);
          }}
        />
      )}
      
      {/* Модальные окна */}
      {showEditModal && (
        <EditPostModal
          post={post}
          serverErrors={editSaveErrors}
          lockPublishSettings={lockPublishSettings}
          onClose={() => { setShowEditModal(false); setEditSaveErrors({}); }}
          onSave={handleSaveEdit}
        />
      )}
      
      {showDeleteModal && (
        <DeletePostModal
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeletePost}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}

export default PostDetail;