import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../../css/app.css';

function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState('popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState('');

  // Форматирование постов с правильным изображением
  const formatPost = (post) => {
    return {
      id: post.id,
      title: post.post_title,
      author: {
        id: post.author?.id,
        name: post.author ? `${post.author.name} ${post.author.user_surname || ''}`.trim() : 'Неизвестный автор',
        avatar: post.author?.avatar_url || post.author?.avatar || '/default-avatar.svg'
      },
      image: post.image_url || '/images/digital-art-1.svg',
      description: post.post_content || '',
      tags: post.tags ? (Array.isArray(post.tags) ? post.tags : post.tags.split(',').map(tag => tag.trim())) : [],
      likes: post.like_count || 0,
      isLiked: !!post.liked,
      comments: post.comment_count || 0,
      createdAt: post.created_at || ''
    };
  };

  // Загрузка постов
  const loadPosts = useCallback(async (page = 1, append = false) => {
    if (page === 1) {
        setIsLoading(true);
    } else {
        setIsLoadingMore(true);
    }
    
    try {
        const sortParam = filter === 'popular' ? 'popular' : 'new';
        const response = await fetch(`/api/posts?sort=${sortParam}&page=${page}&per_page=20`);

        if (response.ok) {
            const data = await response.json();
            const newPosts = (data.data || data).map(formatPost);

            if (append) {
                setPosts(prev => [...prev, ...newPosts]);
            } else {
                setPosts(newPosts);
            }

            setHasMore(!!data.next_page_url);
            setCurrentPage(page);
            setError('');
        } else {
            if (!append) {
                setPosts([]);
                setError('Не удалось загрузить публикации. Попробуйте позже.');
            }
        }
    } catch (error) {
        if (!append) {
            setPosts([]);
            setError('Ошибка соединения с сервером');
        }
    } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
    }
  }, [filter]);

  // Загрузка при изменении фильтра
  useEffect(() => {
    setCurrentPage(1);
    setHasMore(true);
    loadPosts(1, false);
  }, [filter, loadPosts]);

  // Бесконечный скролл
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop + 500 
          < document.documentElement.offsetHeight || !hasMore || isLoading || isLoadingMore) {
        return;
      }
      loadPosts(currentPage + 1, true);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentPage, hasMore, isLoading, isLoadingMore, loadPosts]);

  // Фильтрация постов
  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.author.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="main-content">
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div style={{ fontSize: '1.5rem', color: '#6b7280' }}>Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="search-section">
        <div className="search-bar">
          <input
            type="text"
            className="search-input"
            placeholder="Поиск по названию, автору или тегам..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === 'popular' ? 'active' : ''}`}
            onClick={() => setFilter('popular')}
          >
            Популярные
          </button>
          <button
            className={`filter-btn ${filter === 'newest' ? 'active' : ''}`}
            onClick={() => setFilter('newest')}
          >
            Новые
          </button>
        </div>
      </div>

      {/* Сообщение об ошибке */}
      {error && (
        <div style={{
          backgroundColor: '#f5f5f5',
          border: '1px solid #7B0000',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem',
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

      <div className="fixed-height-grid">
        {filteredPosts.map(post => (
          <div key={post.id} className="fixed-height-card">
            <div className="card-image-wrapper">
              {isAuthenticated ? (
                <Link to={`/post/${post.id}`}>
                  <img 
                    src={post.image} 
                    alt={post.title} 
                    className="fixed-height-image"
                    loading="lazy"
                    onError={(e) => {
                      console.error('Image failed to load:', post.image);
                      e.target.src = '/images/digital-art-1.svg';
                    }}
                  />
                </Link>
              ) : (
                <div onClick={() => setShowLoginModal(true)} style={{ cursor: 'pointer', height: '100%' }}>
                  <img 
                    src={post.image} 
                    alt={post.title} 
                    className="fixed-height-image"
                    loading="lazy"
                    onError={(e) => {
                      console.error('Image failed to load:', post.image);
                      e.target.src = '/images/digital-art-1.svg';
                    }}
                  />
                </div>
              )}
            </div>

            <div className="card-info">
              <h3 className="card-title">
                {isAuthenticated ? (
                  <Link to={`/post/${post.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    {post.title}
                  </Link>
                ) : (
                  <span onClick={() => setShowLoginModal(true)} style={{ cursor: 'pointer' }}>
                    {post.title}
                  </span>
                )}
              </h3>

              <div className="card-author">
                {isAuthenticated ? (
                  <Link to={`/profile/${post.author.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <img 
                        src={post.author.avatar} 
                        alt={post.author.name}
                        className="author-avatar"
                        onError={(e) => {
                          e.target.src = '/default-avatar.svg';
                        }}
                      />
                      <span className="author-name">{post.author.name}</span>
                    </div>
                  </Link>
                ) : (
                  <span onClick={() => setShowLoginModal(true)} style={{ cursor: 'pointer' }}>
                    {post.author.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isLoadingMore && (
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <div style={{ fontSize: '1rem', color: '#6b7280' }}>Загрузка...</div>
        </div>
      )}

      {filteredPosts.length === 0 && !isLoading && (
        <div className="empty-state">
          <div style={{ fontSize: '1.5rem', color: '#6b7280', marginBottom: '1rem' }}>Работы не найдены</div>
          <div style={{ color: '#9ca3af' }}>Попробуйте изменить поисковый запрос или фильтры</div>
        </div>
      )}

      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowLoginModal(false)}>×</button>
            <h2 style={{ marginBottom: '1.5rem', textAlign: 'center', color: '#1f2937' }}>Ошибка</h2>
            <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '2rem' }}>
              Для выполнения этого действия необходимо войти в систему
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setShowLoginModal(false)}>Понятно</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;