import React, { useState, useEffect, useMemo } from 'react';
import { apiFetchLocal as apiFetch } from '../../api';
import { useToast } from '../../contexts/ToastContext';
import ConfirmModal from '../modals/ConfirmModal';
import EmptyState from '../common/EmptyState';
import Alert from '../common/Alert';

/**
 * Управление тегами публикаций: только просмотр и удаление тега из постов (без CRUD тегов).
 */
function AdminTags() {
  const toast = useToast().toast;
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState({ open: false, tag: null });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [listSearch, setListSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');

  const filteredTags = useMemo(() => {
    let list = tags;
    const query = listSearch.trim().toLowerCase();
    if (query) {
      list = list.filter((tag) => tag.name.toLowerCase().includes(query));
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'count_desc') {
        return (b.posts_count || 0) - (a.posts_count || 0)
          || a.name.localeCompare(b.name, 'ru');
      }
      return a.name.localeCompare(b.name, 'ru');
    });
  }, [tags, listSearch, sortBy]);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/admin/tags', {
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        setTags(Array.isArray(data) ? data : []);
        setError('');
      } else {
        const msg = 'Не удалось загрузить теги';
        setError(msg);
      }
    } catch (err) {
      const msg = 'Ошибка соединения с сервером';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!confirmDelete.tag) return;
    const tagName = confirmDelete.tag.name;
    setConfirmDelete({ open: false, tag: null });
    setDeleteLoading(true);
    try {
      const response = await apiFetch('/api/admin/tags', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ tag: tagName }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setSuccessMessage(data.message || 'Тег удалён');
        toast.success(data.message || 'Тег удалён');
        fetchTags();
      } else {
        toast.error(data.message || 'Не удалось удалить тег');
      }
    } catch (err) {
      toast.error('Ошибка соединения с сервером');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="admin-tags">
      <p className="admin-categories__description">
        Теги создаются авторами при публикации. Здесь можно удалить тег из всех публикаций.
        Сами публикации и пользователи при этом не удаляются.
      </p>

      <Alert type="success" message={successMessage} onClose={() => setSuccessMessage('')} className="admin-alert" />
      <Alert type="error" message={error} onClose={() => setError('')} className="admin-alert" />

      <div>
        <h3 className="admin-categories-list-title">
          Список тегов ({filteredTags.length}
          {listSearch && tags.length !== filteredTags.length ? ` из ${tags.length}` : ''}
          )
        </h3>

        {!loading && tags.length > 0 && (
          <div className="admin-filters" style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="Поиск по названию тега..."
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              className="admin-search-input"
              aria-label="Поиск тегов"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
              aria-label="Сортировка тегов"
            >
              <option value="name">По названию (А–Я)</option>
              <option value="count_desc">По количеству публикаций</option>
            </select>
            {listSearch && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setListSearch('')}
              >
                Сбросить
              </button>
            )}
          </div>
        )}

        {loading ? (
          <EmptyState title="Загрузка тегов" />
        ) : tags.length === 0 ? (
          <EmptyState
            title="Тегов пока нет"
            text="Теги появятся после публикаций с указанными тегами."
          />
        ) : filteredTags.length === 0 ? (
          <EmptyState
            title="Ничего не найдено"
            text="По вашему запросу теги не найдены."
            actions={(
              <button
                type="button"
                className="admin-btn admin-btn-outline admin-btn-sm"
                onClick={() => setListSearch('')}
              >
                Сбросить поиск
              </button>
            )}
          />
        ) : (
          <ul className="admin-categories-list">
            {filteredTags.map((tag) => (
              <li key={tag.name} className="admin-category-item">
                <span>
                  {tag.name}{' '}
                  <span style={{ color: '#6c757d' }}>
                    ({tag.posts_count} {tag.posts_count === 1 ? 'публикация' : 'публикаций'})
                  </span>
                </span>
                <button
                  type="button"
                  className="admin-btn admin-btn-danger admin-btn-sm"
                  disabled={deleteLoading}
                  onClick={() => setConfirmDelete({ open: true, tag })}
                  title="Удалить тег из всех публикаций"
                >
                  Удалить
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmModal
        open={confirmDelete.open}
        title="Удаление тега"
        message={
          confirmDelete.tag
            ? `Удалить тег «${confirmDelete.tag.name}» из всех публикаций (${confirmDelete.tag.posts_count})? Публикации останутся в системе.`
            : ''
        }
        confirmText="Удалить тег"
        cancelText="Отмена"
        variant="danger"
        isLoading={deleteLoading}
        onConfirm={handleDeleteConfirm}
        onClose={() => !deleteLoading && setConfirmDelete({ open: false, tag: null })}
      />
    </div>
  );
}

export default AdminTags;
