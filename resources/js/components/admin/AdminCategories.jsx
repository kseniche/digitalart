import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api';
import { useToast } from '../../contexts/ToastContext';
import ConfirmModal from '../modals/ConfirmModal';
import EmptyState from '../common/EmptyState';
import Alert from '../common/Alert';
import AdminTags from './AdminTags';

function AdminCategories() {
  const [activeSubTab, setActiveSubTab] = useState('categories');
  const toast = useToast().toast;
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [newName, setNewName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createErrors, setCreateErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState({ open: false, category: null });

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/admin/categories', {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(Array.isArray(data) ? data : (data.data || []));
        setError('');
      } else {
        const msg = 'Не удалось загрузить категории';
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

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) {
      setCreateErrors({ name: 'Введите название категории' });
      return;
    }
    setCreateErrors({});
    setCreateLoading(true);
    try {
      const response = await apiFetch('/api/admin/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setNewName('');
        setSuccessMessage('Категория создана');
        toast.success('Категория создана');
        fetchCategories();
      } else {
        if (response.status === 422 && data.errors) {
          setCreateErrors(data.errors);
        } else {
          setCreateErrors({ name: data.message || 'Не удалось создать категорию' });
        }
        toast.error(data.message || 'Ошибка создания категории');
      }
    } catch (err) {
      setCreateErrors({ name: 'Ошибка соединения с сервером' });
      toast.error('Ошибка соединения с сервером');
    } finally {
      setCreateLoading(false);
    }
  };

  const startEdit = (category) => {
    if ((category.posts_count || 0) > 0) {
      toast.error('Нельзя изменить категорию: в ней есть публикации');
      return;
    }
    setEditingId(category.id);
    setEditName(category.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingId || !editName.trim()) return;
    try {
      const response = await apiFetch(`/api/admin/categories/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ name: editName.trim() }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setSuccessMessage('Категория обновлена');
        toast.success('Категория обновлена');
        setEditingId(null);
        setEditName('');
        fetchCategories();
      } else {
        toast.error(data.message || 'Ошибка обновления');
      }
    } catch (err) {
      toast.error('Ошибка соединения с сервером');
    }
  };

  const handleDeleteClick = (category) => {
    if ((category.posts_count || 0) > 0) {
      toast.error('Нельзя удалить категорию: в ней есть публикации');
      return;
    }
    setConfirmDelete({ open: true, category });
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete.category) return;
    const id = confirmDelete.category.id;
    setConfirmDelete({ open: false, category: null });
    try {
      const response = await apiFetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
        },
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setSuccessMessage('Категория удалена');
        toast.success('Категория удалена');
        fetchCategories();
      } else {
        toast.error(data.message || 'Не удалось удалить категорию');
      }
    } catch (err) {
      toast.error('Ошибка соединения с сервером');
    }
  };

  return (
    <div className="admin-categories">
      <div className="admin-section-header">
        <h2>Категории | Теги</h2>
        <div className="admin-subtabs" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          <button
            type="button"
            className={`admin-btn admin-btn-sm ${activeSubTab === 'categories' ? 'admin-btn-primary' : 'admin-btn-outline'}`}
            onClick={() => setActiveSubTab('categories')}
          >
            Категории
          </button>
          <button
            type="button"
            className={`admin-btn admin-btn-sm ${activeSubTab === 'tags' ? 'admin-btn-primary' : 'admin-btn-outline'}`}
            onClick={() => setActiveSubTab('tags')}
          >
            Теги
          </button>
        </div>
      </div>

      {activeSubTab === 'tags' ? (
        <AdminTags />
      ) : (
        <>
      <p className="admin-categories__description">
        Создавайте категории для публикаций. Они отображаются при создании и редактировании поста.
      </p>

      <Alert type="success" message={successMessage} onClose={() => setSuccessMessage('')} className="admin-alert" />
      <Alert type="error" message={error} onClose={() => setError('')} className="admin-alert" />

      <div className="admin-banned-words">
        <h3 className="admin-banned-words__title">Новая категория</h3>
        <form onSubmit={handleCreate} className="admin-banned-words__form">
          <input
            type="text"
            value={newName}
            onChange={(e) => { setNewName(e.target.value); setCreateErrors({}); }}
            placeholder="Название категории"
            maxLength={255}
            className={`admin-search-input ${createErrors.name ? 'error' : ''}`}
          />
          <button
            type="submit"
            className="admin-btn admin-btn-primary admin-btn-sm"
            disabled={createLoading}
          >
            {createLoading ? 'Создание...' : 'Создать'}
          </button>
        </form>
        {createErrors.name && (
          <div className="form-error">
            {Array.isArray(createErrors.name) ? createErrors.name[0] : createErrors.name}
          </div>
        )}
      </div>

      <div>
        <h3 className="admin-categories-list-title">
          Список категорий ({categories.length})
        </h3>
        {loading ? (
          <EmptyState title="Загрузка категорий" />
        ) : categories.length === 0 ? (
          <EmptyState
            title="Категорий пока нет"
            text="Создайте первую категорию для удобной модерации публикаций."
            actions={<button type="button" className="admin-btn admin-btn-primary admin-btn-sm" onClick={() => setNewName('Новая категория')}>Заполнить пример</button>}
          />
        ) : (
          <ul className="admin-categories-list">
            {categories.map((cat) => (
              <li key={cat.id} className="admin-category-item">
                {editingId === cat.id ? (
                  <form onSubmit={handleUpdate} style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={255}
                    />
                    <button type="submit" className="admin-btn admin-btn-success admin-btn-sm">
                      Сохранить
                    </button>
                    <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" onClick={cancelEdit}>
                      Отмена
                    </button>
                  </form>
                ) : (
                  <>
                    <span>
                      {cat.name} <span style={{ color: '#6c757d' }}>({cat.posts_count || 0})</span>
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="admin-btn admin-btn-outline admin-btn-sm"
                        disabled={(cat.posts_count || 0) > 0}
                        onClick={() => startEdit(cat)}
                        title={(cat.posts_count || 0) > 0 ? 'Нельзя изменить категорию, пока в ней есть публикации' : 'Изменить категорию'}
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-danger admin-btn-sm"
                        disabled={(cat.posts_count || 0) > 0}
                        onClick={() => handleDeleteClick(cat)}
                        title={(cat.posts_count || 0) > 0 ? 'Нельзя удалить категорию, пока в ней есть публикации' : 'Удалить категорию'}
                      >
                        Удалить
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmModal
        open={confirmDelete.open}
        title="Удаление категории"
        message={
          confirmDelete.category
            ? `Удалить категорию «${confirmDelete.category.name}»? Это возможно только если к ней не привязаны публикации.`
            : ''
        }
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onClose={() => setConfirmDelete({ open: false, category: null })}
      />
        </>
      )}
    </div>
  );
}

export default AdminCategories;
