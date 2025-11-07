import React, { useState, useEffect } from 'react';
import CommentCard from './CommentCard';

function AdminComments() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchComments();
  }, [statusFilter, searchQuery, currentPage]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchQuery && { search: searchQuery }),
      });

      const response = await fetch(`/api/admin/comments?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setComments(data.data || []);
        setTotalPages(data.last_page || 1);
        setError(null);
      } else {
        setError('Не удалось загрузить список комментариев. Попробуйте позже.');
      }
    } catch (error) {
      setError('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  const handleCommentAction = (action, commentId) => {
    if (action === 'delete') {
      deleteComment(commentId);
    } else if (action === 'restore') {
      restoreComment(commentId);
    }
  };

  const deleteComment = async (commentId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот комментарий?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setSuccessMessage('Комментарий успешно удалён');
        fetchComments();
      } else {
        setError('Не удалось удалить комментарий');
      }
    } catch (error) {
      setError('Ошибка соединения с сервером');
    }
  };

  const restoreComment = async (commentId) => {
    try {
      const response = await fetch(`/api/admin/comments/${commentId}/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setSuccessMessage('Комментарий успешно восстановлен');
        fetchComments();
      } else {
        setError('Не удалось восстановить комментарий');
      }
    } catch (error) {
      setError('Ошибка соединения с сервером');
    }
  };


  return (
    <div className="admin-comments">
      <div className="admin-section-header">
        <h2>Управление комментариями</h2>
        
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

        {error && error !== '' && (
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
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">Все комментарии</option>
            <option value="active">Активные</option>
            <option value="deleted">Удаленные</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">Загрузка комментариев...</div>
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
            <div className="empty-state">
              <p>Комментарии не найдены</p>
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

export default AdminComments;


