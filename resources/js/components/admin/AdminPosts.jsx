import React, { useState, useEffect } from 'react';
import PostCard from './PostCard';

function AdminPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [successMessage, setSuccessMessage] = useState('');

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

      const response = await fetch(`/api/admin/posts?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(data.data || []);
        setTotalPages(data.last_page || 1);
        setError(null);
      } else {
        setError('Не удалось загрузить список публикаций. Попробуйте позже.');
      }
    } catch (error) {
      setError('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  const handlePostAction = (action, postId) => {
    if (action === 'delete') {
      deletePost(postId);
    } else if (action === 'restore') {
      restorePost(postId);
    }
  };

  const deletePost = async (postId) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту публикацию?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setSuccessMessage('Публикация успешно удалена');
        fetchPosts();
      } else {
        setError('Не удалось удалить публикацию');
      }
    } catch (error) {
      setError('Ошибка соединения с сервером');
    }
  };

  const restorePost = async (postId) => {
    try {
      const response = await fetch(`/api/admin/posts/${postId}/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setSuccessMessage('Публикация успешно восстановлена');
        fetchPosts();
      } else {
        setError('Не удалось восстановить публикацию');
      }
    } catch (error) {
      setError('Ошибка соединения с сервером');
    }
  };


  return (
    <div className="admin-posts">
      <div className="admin-section-header">
        <h2>Управление публикациями</h2>
        
        {/* Сообщения об успехе и ошибках */}
        {successMessage && successMessage !== '' && (
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '8px',
            padding: '1rem',
            marginTop: '1rem',
            marginBottom: '1rem',
            color: '#166534',
            fontSize: '0.875rem',
            fontFamily: 'JetBrains Mono, monospace',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            {successMessage}
            <button
              onClick={() => setSuccessMessage('')}
              style={{
                background: 'none',
                border: 'none',
                color: '#166534',
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

        {error && (
          <div style={{
            backgroundColor: '#f5f5f5',
            border: '1px solid #7B0000',
            borderRadius: '8px',
            padding: '1rem',
            marginTop: '1rem',
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
        <div className="admin-filters">
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
            <option value="all">Все публикации</option>
            <option value="active">Активные</option>
            <option value="deleted">Удаленные</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">Загрузка публикаций...</div>
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
            <div className="empty-state">
              <p>Публикации не найдены</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="btn btn-outline"
              >
                Назад
              </button>
              <span className="pagination-info">
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


