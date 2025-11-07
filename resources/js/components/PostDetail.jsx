import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import EditPostModal from './modals/EditPostModal';
import DeletePostModal from './modals/DeletePostModal';
import '../../css/app.css';

function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [error, setError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Проверяем, является ли текущий пользователь автором поста
  const isOwnPost = post && user && post.author?.id === user.id;

  const handleLike = async () => {
    if (!isAuthenticated) return setShowLoginModal(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/posts/${id}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
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
        setError('Не удалось поставить лайк. Попробуйте позже.');
      }
    } catch (error) {
      setError('Ошибка соединения с сервером');
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) return setShowLoginModal(true);
    if (!newComment.trim()) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/posts/${id}/comments`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`, 
                'Content-Type': 'application/json', 
                'Accept': 'application/json' 
            },
            body: JSON.stringify({ content: newComment })
        });
        
        if (response.ok) {
            const result = await response.json();
            setComments(prev => [...prev, {
                id: result.comment.id,
                author: `${user.name} ${user.user_surname || ''}`.trim(),
                avatar: user.avatar_url || user.avatar || '/default-avatar.svg',
                text: result.comment.content || result.comment.comment_content,
                createdAt: result.comment.created_at
            }]);
            setNewComment('');
            setError('');
        } else {
            setError('Не удалось отправить комментарий. Попробуйте позже.');
        }
    } catch (error) {
        setError('Ошибка соединения с сервером');
    }
  };

  useEffect(() => {
    const loadPost = async () => {
        if (!id) return setIsLoading(false);
        setIsLoading(true);
        try {
            const response = await fetch(`/api/posts/${id}`);
            if (response.ok) {
                const postData = await response.json();
                setPost(postData);
                setLikes(postData.like_count || 0);
                setIsLiked(!!postData.liked);
                
                const formattedComments = (postData.comments || []).map(comment => ({
                    id: comment.id,
                    author: comment.author ? 
                      `${comment.author.name} ${comment.author.user_surname || ''}`.trim() : 
                      'Неизвестный автор',
                    avatar: comment.author?.avatar_url || comment.author?.avatar || '/default-avatar.svg',
                    text: comment.comment_content || '',
                    createdAt: comment.created_at
                }));
                
                setComments(formattedComments);
            } else {
                setPost(null);
            }
        } catch (error) {
            console.error('Error loading post:', error);
            setPost(null);
        } finally {
            setIsLoading(false);
        }
    };
    loadPost();
}, [id]);

  // Обработка сохранения изменений
  const handleSaveEdit = async (formData) => {
    setIsSaving(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/posts/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          tags: formData.tags
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Не удалось сохранить изменения';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // ignore
        }
        throw new Error(errorMessage);
      }

      // Перезагружаем пост для получения актуальных данных
      const reloadResponse = await fetch(`/api/posts/${id}`);
      if (reloadResponse.ok) {
        const postData = await reloadResponse.json();
        setPost(postData);
      }
      
      setShowEditModal(false);
      setError('');
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
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
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

      // Успешно удалено - перенаправляем на главную
      navigate('/');
    } catch (e) {
      setError(e.message || 'Ошибка удаления публикации');
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (isLoading) return <div className="main-content"><div className="loading-state">Загрузка...</div></div>;
  if (!post) return <div className="main-content"><div className="empty-state">Работа не найдена</div></div>;
  if (!isAuthenticated) return <div className="main-content"><div className="empty-state">Необходима авторизация</div></div>;

  return (
    <div className="main-content" style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'flex-start',
      padding: '2rem 1rem',
      minHeight: 'calc(100vh - 120px)'
    }}>
      <div style={{
        position: 'relative',
        backgroundColor: '#DEDDD8',
        borderRadius: '16px',
        border: '1px solid #D4D1CC',
        maxWidth: '1100px',
        width: '100%',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        {/* Кнопка закрытия */}
        <button
          onClick={() => window.history.back()}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: '#D4D1CC',
            color: '#111827',
            fontSize: '1.5rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            transition: 'all 0.2s',
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 'bold'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#7B0000';
            e.target.style.color = '#DEDDD8';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#D4D1CC';
            e.target.style.color = '#111827';
          }}
        >
          ×
        </button>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '0',
        minHeight: '600px'
      }}>
        {/* Левая часть - изображение */}
        <div style={{
          backgroundColor: '#DEDDD8',
          padding: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRight: '1px solid #D4D1CC'
        }}>
      <img 
    src={post.image_url || post.media_path || '/images/digital-art-1.svg'} 
    alt={post.post_title} 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '600px',
              borderRadius: '8px',
              objectFit: 'contain',
              cursor: 'pointer'
            }}
            onClick={(e) => {
              window.open(e.target.src, '_blank');
            }}
          />
        </div>

        {/* Правая часть - информация */}
        <div style={{
          backgroundColor: '#DEDDD8',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          maxHeight: '600px',
          overflowY: 'auto'
        }}>
          <div style={{
            paddingBottom: '1rem',
            borderBottom: '1px solid #D4D1CC'
          }}>
            {isAuthenticated && post.author?.id ? (
              <Link 
                to={`/profile/${post.author.id}`} 
                style={{ 
                  textDecoration: 'none', 
                  color: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                <img 
                  src={post.author?.avatar_url || post.author?.avatar || '/default-avatar.svg'}
                  alt={post.author?.name || 'Автор'}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: '2px solid #D4D1CC',
                    objectFit: 'cover'
                  }}
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
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: '2px solid #D4D1CC',
                    objectFit: 'cover'
                  }}
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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <h2 style={{ 
              fontSize: '1.25rem', 
              fontWeight: 'bold', 
              color: '#111827',
              fontFamily: 'JetBrains Mono, monospace',
              margin: 0,
              flex: 1
            }}>
              {post.post_title}
            </h2>
            {isOwnPost && (
              <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                <button
                  onClick={() => setShowEditModal(true)}
                  style={{
                    background: 'none',
                    border: '1px solid #D4D1CC',
                    borderRadius: '8px',
                    padding: '0.5rem 1rem',
                    cursor: 'pointer',
                    color: '#111827',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '0.85rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#D4D1CC';
                    e.target.style.borderColor = '#7B0000';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.borderColor = '#D4D1CC';
                  }}
                >
                  Редактировать
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  style={{
                    background: '#7B0000',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.5rem 1rem',
                    cursor: 'pointer',
                    color: 'white',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '0.85rem',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.opacity = '0.8';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.opacity = '1';
                  }}
                >
                  Удалить
                </button>
              </div>
            )}
          </div>

          <div style={{
            fontSize: '0.85rem',
            color: '#6b7280',
            fontFamily: 'JetBrains Mono, monospace',
            marginBottom: '0.5rem'
          }}>
            {new Date(post.created_at).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </div>

          <p style={{ 
            color: '#374151', 
            lineHeight: '1.5',
            fontFamily: 'JetBrains Mono, monospace',
            margin: 0,
            fontSize: '0.85rem',
            marginBottom: '1rem'
          }}>
            {post.post_content}
          </p>

          {/* Теги */}
          {post.tags && post.tags.length > 0 && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              marginBottom: '1rem'
            }}>
              {(Array.isArray(post.tags) ? post.tags : post.tags.split(',')).map((tag, index) => (
                <span
                  key={index}
                  style={{
                    backgroundColor: '#D4D1CC',
                    color: '#7B0000',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '16px',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    fontFamily: 'JetBrains Mono, monospace'
                  }}
                >
                  #{typeof tag === 'string' ? tag.trim() : tag}
                </span>
              ))}
            </div>
          )}

          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            paddingTop: '1rem',
            paddingBottom: '1rem',
            borderTop: '1px solid #D4D1CC',
            borderBottom: '1px solid #D4D1CC'
          }}>
            <button
              onClick={handleLike}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: isLiked ? '#7B0000' : '#6b7280',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.9rem',
                padding: '0.5rem',
                borderRadius: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#D4D1CC';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>{isLiked ? '❤️' : '🤍'}</span>
              {isLiked ? 'Нравится' : 'Нравится'} ({likes})
            </button>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#6b7280',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.9rem'
            }}>
              Комментарии: {comments.length}
            </div>
          </div>

          {/* Комментарии в компактном виде */}
          <div style={{
            marginTop: '1rem'
          }}>
            {/* Сообщение об ошибке */}
            {error && (
              <div style={{
                backgroundColor: '#f5f5f5',
                border: '1px solid #7B0000',
                borderRadius: '8px',
                padding: '0.75rem',
                marginBottom: '1rem',
                color: '#7B0000',
                fontSize: '0.875rem',
                fontFamily: 'JetBrains Mono, monospace',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                {error}
                <button
                  onClick={() => setError('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#7B0000',
                    cursor: 'pointer',
                    fontSize: '1.25rem',
                    lineHeight: 1,
                    padding: 0
                  }}
                >
                  ×
                </button>
              </div>
            )}

            <form onSubmit={handleComment} style={{ marginBottom: '1rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                backgroundColor: '#D4D1CC',
                borderRadius: '8px',
                border: '2px solid transparent',
                transition: 'border-color 0.2s'
              }}
              >
                <img 
                  src={user?.avatar_url || user?.avatar || '/default-avatar.svg'}
                  alt="Вы"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: '2px solid #DEDDD8',
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    e.target.src = '/default-avatar.svg';
                  }}
                />
                <input 
                  type="text"
                  value={newComment} 
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Оставить комментарий..."
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '0.85rem',
                    color: '#111827'
                  }}
                  onFocus={(e) => e.target.parentElement.style.borderColor = '#7B0000'}
                  onBlur={(e) => e.target.parentElement.style.borderColor = 'transparent'}
                />
                <button 
                  type="submit"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#7B0000',
                    fontSize: '1.2rem',
                    padding: '0.25rem',
                    lineHeight: 1
                  }}
                >
                  →
                </button>
              </div>
      </form>

            <div style={{
              maxHeight: '250px',
              overflowY: 'auto'
            }}>
      {comments.map(c => (
                <div 
                  key={c.id}
                  style={{
                    padding: '0.75rem',
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'flex-start'
                  }}
                >
                  <img 
                    src={c.avatar} 
                    alt={c.author}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: '2px solid #D4D1CC',
                      objectFit: 'cover',
                      flexShrink: 0
                    }}
                    onError={(e) => {
                      e.target.src = '/default-avatar.svg';
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '0.5rem',
                      marginBottom: '0.25rem'
                    }}>
                      <strong style={{ 
                        color: '#111827',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                      }}>
                        {c.author}
                      </strong>
                    </div>
                    <p style={{ 
                      color: '#374151',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '0.8rem',
                      margin: 0,
                      lineHeight: '1.4'
                    }}>
                      {c.text}
                    </p>
                  </div>
        </div>
      ))}

              {comments.length === 0 && (
                <div style={{ 
                  padding: '2rem 1rem',
                  textAlign: 'center',
                  color: '#6b7280',
                  fontSize: '0.85rem',
                  fontFamily: 'JetBrains Mono, monospace'
                }}>
                  Комментариев пока нет
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>

      {showLoginModal && <div className="modal-overlay">Вход required</div>}
      
      {/* Модальные окна */}
      {showEditModal && (
        <EditPostModal
          post={post}
          onClose={() => setShowEditModal(false)}
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