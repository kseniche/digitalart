import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useGoBack } from '../hooks/useGoBack';
import { getReturnState } from '../utils/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { apiFetchLocal as apiFetch } from '../api';
import EditPostModal from './modals/EditPostModal';
import DeletePostModal from './modals/DeletePostModal';
import LoginModal from './modals/LoginModal';
import RegisterModal from './modals/RegisterModal';
import CommentRulesAcceptModal from './modals/CommentRulesAcceptModal';
import EmptyState from './common/EmptyState';
import Alert from './common/Alert';
import MediaPreview from './common/MediaPreview';
import MediaLightbox from './common/MediaLightbox';
import { IconHeart, IconBookmark, IconComment, IconEdit, IconTrash, IconPublish } from './common/SocialIcons';
import MasonryGrid from './common/MasonryGrid';
import MasonryRecommendationCard from './MasonryRecommendationCard';
import CommentActionsMenu from './common/CommentActionsMenu';
import PostActionsMenu from './common/PostActionsMenu';
import FeedTagLink from './common/FeedTagLink';
import FeedCategoryLink from './common/FeedCategoryLink';
import { normalizeTagsList } from '../utils/feedUrl';
import CharCounter from './common/CharCounter';
import { FIELD_LIMITS } from '../constants/fieldLimits';
import { mapApiValidationErrors } from '../utils/apiValidation';
import { validateMaxLength, validateRequired } from '../utils/fieldValidation';
import '../../css/app.css';

const COMMENT_LIMIT = FIELD_LIMITS.comment;

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
  const [commentFieldError, setCommentFieldError] = useState('');
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
  const [mediaLightboxOpen, setMediaLightboxOpen] = useState(false);
  const isCommentCooldownActive = Date.now() < nextCommentAllowedAt;
  const hasAcceptedCommentRules = Boolean(user?.comment_rules_accepted_at);

  // Проверяем, является ли текущий пользователь автором поста
  const isOwnPost = post && user && post.author?.id === user.id;
  /** Отклонённая модерацией публикация: без ленты соц.действий, комментариев и рекомендаций */
  const isRejectedUnpublished = post?.moderation_status === 'rejected';
  const isLockedByReport = !!post?.hidden_by_report && isRejectedUnpublished;
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
        toast.error('Не удалось поставить лайк. Попробуйте позже.');
      }
    } catch {
      toast.error('Ошибка соединения с сервером');
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
      toast.error(`Комментарий можно отправить через ${secondsLeft} сек.`);
      return;
    }

    const required = validateRequired(newComment, 'Комментарий');
    const maxErr = validateMaxLength(newComment, COMMENT_LIMIT.content.max, 'Комментарий');
    if (required || maxErr) {
      setCommentFieldError(required || maxErr);
      return;
    }

    setCommentFieldError('');
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
            userId: createdComment.author?.id ?? user?.id,
            author: createdComment.author
              ? `${createdComment.author.name || ''} ${createdComment.author.surname || ''}`.trim() || 'Неизвестный автор'
              : 'Неизвестный автор',
            avatar:
              createdComment.author?.avatar_url
              || createdComment.author?.avatar
              || user?.avatar_url
              || user?.avatar
              || '/default-avatar.svg',
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
      } else if (response.status === 422 && data?.errors) {
        const mapped = mapApiValidationErrors(data.errors);
        setCommentFieldError(mapped.content || data.message || 'Проверьте текст комментария');
        setError('');
      } else {
        setError(data?.message || 'Не удалось отправить комментарий. Попробуйте позже.');
      }
    } catch {
      setError('Ошибка соединения с сервером');
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
    userId: comment.user_id ?? comment.author?.id,
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
      const response = await apiFetch(`/api/posts/${id}?comments_sort=${sort}`, {
headers: { 'Accept': 'application/json' },
      });
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
      const reloadResponse = await apiFetch(`/api/posts/${id}`, {
headers: { 'Accept': 'application/json' },
      });
      if (reloadResponse.ok) {
        const postData = await reloadResponse.json();
        setPost(postData);
      }
      
      setShowEditModal(false);
      setError('');
      setEditSaveErrors({});
    } catch (e) {
      setError(e.message || 'Ошибка сохранения изменений');
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
      setError(e.message || 'Ошибка удаления публикации');
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
      setError(e.message || 'Ошибка публикации');
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
          type="button"
          onClick={goBack}
          aria-label="Назад"
          title="Назад"
          className="ui-icon-btn post-detail-close-btn"
        >
          ×
        </button>

      <div className="post-detail-grid">
        {/* Левая часть - изображение */}
        <div className="post-detail-media-col">
          <div className="post-detail-media-wrap">
            <button
              type="button"
              className="post-detail-media-trigger"
              onClick={() => setMediaLightboxOpen(true)}
              aria-label="Открыть медиа на весь экран"
            >
              <MediaPreview
                src={post.image_url || post.media_path}
                mediaType={post.media_type}
                alt={post.post_title}
                interactionMode="card"
                controls={false}
                style={{
                  maxWidth: '100%',
                  maxHeight: '600px',
                  borderRadius: '8px',
                  objectFit: 'contain',
                  cursor: 'pointer',
                  display: 'block',
                  width: '100%',
                }}
              />
            </button>
            {post.media_type !== 'video' && (
              <button
                type="button"
                className="post-detail-fullscreen-icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setMediaLightboxOpen(true);
                }}
                aria-label="Просмотр в полноэкранном режиме"
                title="Просмотр в полноэкранном режиме"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M9 3H5a2 2 0 0 0-2 2v4M15 3h4a2 2 0 0 1 2 2v4M9 21H5a2 2 0 0 1-2-2v-4M15 21h4a2 2 0 0 0 2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
          <MediaLightbox
            open={mediaLightboxOpen}
            src={post.image_url || post.media_path}
            mediaType={post.media_type}
            alt={post.post_title}
            onClose={() => setMediaLightboxOpen(false)}
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
              <div className="post-rejected-title">
                {isLockedByReport
                  ? 'Публикация скрыта по результатам рассмотрения жалобы'
                  : 'Публикация отклонена модерацией'}
              </div>
              <div className="post-rejected-label">Причина:</div>
              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {(post.moderation_rejection_reason && String(post.moderation_rejection_reason).trim()) || 'Нарушает правила сообщества.'}
              </div>
              {isLockedByReport && (
                <p className="post-rejected-note" style={{ marginTop: '0.75rem' }}>
                  Публикация не может быть изменена или отправлена повторно на модерацию.
                </p>
              )}
            </div>
          )}
          <div className="post-author-block">
            {isAuthenticated && post.author?.id ? (
              <Link
                to={`/profile/${post.author.id}`}
                state={postLinkState}
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
            {isApprovedPublished && !isRejectedUnpublished && !isOwnPost && (
              <PostActionsMenu
                postId={post.id}
                authorUserId={post.author?.id}
                onReported={(msg) => toast.success(msg || 'Жалоба принята')}
                onLoginRequired={() => setShowLoginModal(true)}
              />
            )}
            {isOwnPost && (
              <div className="post-detail-actions">
                {post.is_draft ? (
                  <>
                    <button
                      type="button"
                      className="post-social-action post-social-action--danger"
                      onClick={() => setShowDeleteModal(true)}
                      aria-label="Удалить"
                    >
                      <IconTrash />
                      <span className="post-social-action__label">Удалить</span>
                    </button>
                    <button
                      type="button"
                      className="post-social-action"
                      onClick={() => setShowEditModal(true)}
                      aria-label="Редактировать"
                    >
                      <IconEdit />
                      <span className="post-social-action__label">Редактировать</span>
                    </button>
                    <button
                      type="button"
                      className="post-social-action post-social-action--brand"
                      onClick={handlePublish}
                      disabled={isPublishing}
                      aria-label={isPublishing ? 'Публикация…' : 'Опубликовать'}
                    >
                      <IconPublish />
                      <span className="post-social-action__label">
                        {isPublishing ? 'Публикация…' : 'Опубликовать'}
                      </span>
                    </button>
                  </>
                ) : (
                  <>
                    {!isLockedByReport && (
                      <button
                        type="button"
                        className="post-social-action"
                        onClick={() => setShowEditModal(true)}
                        aria-label="Редактировать"
                      >
                        <IconEdit />
                        <span className="post-social-action__label">Редактировать</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="post-social-action post-social-action--danger"
                      onClick={() => setShowDeleteModal(true)}
                      aria-label="Удалить"
                    >
                      <IconTrash />
                      <span className="post-social-action__label">Удалить</span>
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
              <>
                <span className="post-detail-meta-sep" aria-hidden="true">·</span>
                <FeedCategoryLink
                  categoryId={post.category_id ?? post.category?.id}
                  categoryName={typeof post.category === 'string' ? post.category : post.category?.name}
                  className="post-detail-category"
                />
              </>
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
          {normalizeTagsList(post.tags).length > 0 && (
            <div className="post-detail-tags">
              {normalizeTagsList(post.tags).map((tag, index) => (
                <FeedTagLink key={`${tag}-${index}`} tag={tag} className="post-detail-tag" />
              ))}
            </div>
          )}

          {isApprovedPublished && !isRejectedUnpublished && (
          <div className="post-detail-social-row">
            <button
              type="button"
              onClick={handleLike}
              className="post-social-action"
              style={{ color: isLiked ? '#7B0000' : '#6b7280' }}
              aria-label={`Нравится, ${likes} лайков`}
              title={`Нравится (${likes})`}
            >
              <IconHeart active={isLiked} />
              <span className="post-social-action__count">{likes}</span>
              <span className="post-social-action__label">Нравится</span>
            </button>
            <button
              type="button"
              onClick={handleFavorite}
              className="post-social-action"
              style={{ color: isFavorited ? '#7B0000' : '#6b7280' }}
              aria-label={isFavorited ? 'Убрать из избранного' : 'В избранное'}
              title={isFavorited ? 'В избранном' : 'В избранное'}
            >
              <IconBookmark active={isFavorited} />
              <span className="post-social-action__label">{isFavorited ? 'В избранном' : 'В избранное'}</span>
            </button>
            <div className="post-social-action post-social-action--static" aria-label={`Комментарии: ${comments.length}`}>
              <IconComment />
              <span className="post-social-action__count">{comments.length}</span>
              <span className="post-social-action__label">Комментарии</span>
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
                <textarea
                  rows={2}
                  value={newComment}
                  onChange={(e) => {
                    setNewComment(e.target.value);
                    if (commentFieldError) setCommentFieldError('');
                  }}
                  placeholder="Оставить комментарий..."
                  className={`post-comment-input post-comment-input--area${commentFieldError ? ' error' : ''}`}
                  maxLength={COMMENT_LIMIT.content.max}
                  aria-invalid={!!commentFieldError}
                />
                <button
                  type="submit"
                  disabled={isCommentSubmitting || isCommentCooldownActive}
                  className="post-comment-submit"
                  aria-label="Отправить комментарий"
                >
                  →
                </button>
              </div>
              <CharCounter
                value={newComment}
                max={COMMENT_LIMIT.content.max}
                min={COMMENT_LIMIT.content.min}
                required={false}
                hint="Текст комментария"
              />
              {commentFieldError && (
                <div className="form-error" style={{ marginTop: '0.35rem' }}>{commentFieldError}</div>
              )}
      </form>

            <div className="ui-segmented-control" role="group" aria-label="Сортировка комментариев">
              <button
                type="button"
                className={`ui-segmented-control__btn${commentsSort === 'new' ? ' ui-segmented-control__btn--active' : ''}`}
                onClick={() => setCommentsSort('new')}
                aria-pressed={commentsSort === 'new'}
              >
                Новые
              </button>
              <button
                type="button"
                className={`ui-segmented-control__btn${commentsSort === 'popular' ? ' ui-segmented-control__btn--active' : ''}`}
                onClick={() => setCommentsSort('popular')}
                aria-pressed={commentsSort === 'popular'}
              >
                Популярные
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
                        className={`post-comment-like${c.is_liked ? ' post-comment-like--active' : ''}`}
                        aria-label={`${c.is_liked ? 'Убрать лайк' : 'Нравится'}, ${c.likes_count ?? 0}`}
                        title={c.is_liked ? 'Убрать лайк' : 'Нравится'}
                      >
                        <IconHeart active={c.is_liked} />
                        <span className="post-comment-like__count">{c.likes_count ?? 0}</span>
                      </button>
                    )}
                    {!isAuthenticated && (c.likes_count ?? 0) > 0 && (
                      <span className="post-comment-like post-comment-like--static" aria-hidden="true">
                        <IconHeart active={false} />
                        <span className="post-comment-like__count">{c.likes_count}</span>
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