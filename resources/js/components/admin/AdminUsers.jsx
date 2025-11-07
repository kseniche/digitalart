import React, { useState, useEffect } from 'react';
import UserCard from './UserCard';
import UserDetail from './UserDetail';

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [successMessage, setSuccessMessage] = useState('');

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

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.data || []);
        setTotalPages(data.last_page || 1);
      } else {
        setError('Не удалось загрузить список пользователей. Попробуйте позже.');
      }
    } catch (error) {
      setError('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = (action, userId) => {
    if (action === 'view') {
      fetchUserDetail(userId);
    } else if (action === 'delete') {
      deleteUser(userId);
    } else if (action === 'restore') {
      restoreUser(userId);
    }
  };

  const fetchUserDetail = async (userId) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
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
    if (!window.confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setSuccessMessage('Пользователь успешно удалён');
        fetchUsers();
        if (selectedUser && selectedUser.id === userId) {
          setSelectedUser(null);
        }
      } else {
        setError('Не удалось удалить пользователя');
      }
    } catch (error) {
      setError('Ошибка соединения с сервером');
    }
  };

  const restoreUser = async (userId) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setSuccessMessage('Пользователь успешно восстановлен');
        fetchUsers();
        if (selectedUser && selectedUser.id === userId) {
          setSelectedUser(null);
        }
      } else {
        setError('Не удалось восстановить пользователя');
      }
    } catch (error) {
      setError('Ошибка соединения с сервером');
    }
  };


  if (selectedUser) {
    return (
      <UserDetail
        user={selectedUser}
        onBack={() => setSelectedUser(null)}
        onUserAction={handleUserAction}
      />
    );
  }

  return (
    <div className="admin-users">
      <div className="admin-section-header">
        <h2>Управление пользователями</h2>
        
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
        <div className="loading">Загрузка пользователей...</div>
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
            <div className="empty-state">
              <p>Пользователи не найдены</p>
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

export default AdminUsers;


