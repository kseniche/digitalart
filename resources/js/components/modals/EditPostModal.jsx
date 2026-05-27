import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api';
import Alert from '../common/Alert';
import '../../../css/app.css';

function EditPostModal({ post, serverErrors = {}, onClose, onSave, lockPublishSettings = false }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: '',
    category_id: '',
    is_draft: false,
    publish_mode: 'now',
    published_at: ''
  });
  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    apiFetch('/api/categories')
      .then((r) => r.ok ? r.json() : [])
      .then((list) => setCategories(Array.isArray(list) ? list : []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (post) {
      const pubAt = post.published_at;
      const hasScheduled = pubAt && new Date(pubAt) > new Date();
      let publishedAtLocal = '';
      if (pubAt) {
        const d = new Date(pubAt);
        publishedAtLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      }
      setFormData({
        title: post.post_title || '',
        description: post.post_content || '',
        tags: post.tags ? (Array.isArray(post.tags) ? post.tags.join(', ') : post.tags) : '',
        category_id: post.category_id ? String(post.category_id) : '',
        is_draft: !!post.is_draft,
        publish_mode: hasScheduled ? 'schedule' : 'now',
        published_at: publishedAtLocal
      });
    }
  }, [post]);

  useEffect(() => {
    if (serverErrors && typeof serverErrors === 'object' && Object.keys(serverErrors).length > 0) {
      const flat = {};
      Object.keys(serverErrors).forEach(key => {
        const v = serverErrors[key];
        flat[key] = Array.isArray(v) ? v[0] : v;
      });
      setErrors(prev => ({ ...prev, ...flat }));
    }
  }, [serverErrors]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Очищаем ошибку при изменении поля
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Название обязательно';
    } else if (formData.title.length > 255) {
      newErrors.title = 'Название не должно превышать 255 символов';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Описание обязательно';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      await onSave(formData);
    } catch (error) {
      setErrors(prev => ({ ...prev, general: error.message || 'Ошибка при сохранении изменений' }));
    } finally {
      setIsLoading(false);
    }
  };

  if (!post) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        
        <h2 style={{ 
          marginBottom: '1.5rem', 
          textAlign: 'center', 
          color: '#111827', 
          fontFamily: 'JetBrains Mono, monospace' 
        }}>
          Редактировать публикацию
        </h2>

        <Alert type="error" message={errors.general || ''} className="home-alert" />

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title" className="form-label">
              Название *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={`form-input ${errors.title ? 'error' : ''}`}
              placeholder="Введите название работы"
              maxLength={255}
            />
            <div className="ui-form-help ui-form-help-row">
              <span>Обязательное поле</span>
              <span>{formData.title.length}/255</span>
            </div>
            {errors.title && (
              <div className="form-error" style={{ marginTop: '0.5rem' }}>
                {errors.title}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Описание *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className={`form-input ${errors.description ? 'error' : ''}`}
              placeholder="Опишите вашу работу"
              rows={6}
              style={{ resize: 'vertical' }}
            />
            <div className="ui-form-help">
              Обязательное поле. Markdown: **жирный**, *курсив*, - список, [ссылка](url).
            </div>
            {errors.description && (
              <div className="form-error" style={{ marginTop: '0.5rem' }}>
                {errors.description}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="category_id" className="form-label">
              Категория
            </label>
            <select
              id="category_id"
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              className="form-input"
              style={{ cursor: 'pointer' }}
            >
              <option value="">— Выберите категорию —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {!lockPublishSettings && (
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              id="is_draft"
              name="is_draft"
              checked={!!formData.is_draft}
              onChange={(e) => setFormData(prev => ({ ...prev, is_draft: e.target.checked }))}
            />
            <label htmlFor="is_draft" className="form-label" style={{ marginBottom: 0 }}>
              Сохранить как черновик (не публиковать в ленту)
            </label>
          </div>
          )}

          {!lockPublishSettings && !formData.is_draft && (
            <div className="form-group">
              <span className="form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Публикация</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}>
                  <input
                    type="radio"
                    name="publish_mode"
                    checked={formData.publish_mode === 'now'}
                    onChange={() => setFormData(prev => ({ ...prev, publish_mode: 'now' }))}
                  />
                  Опубликовать сразу
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}>
                  <input
                    type="radio"
                    name="publish_mode"
                    checked={formData.publish_mode === 'schedule'}
                    onChange={() => setFormData(prev => ({ ...prev, publish_mode: 'schedule' }))}
                  />
                  Запланировать на дату
                </label>
                {formData.publish_mode === 'schedule' && (
                  <input
                    type="datetime-local"
                    name="published_at"
                    value={formData.published_at}
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={handleChange}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '8px',
                      border: '1px solid #D4D1CC',
                      fontFamily: 'JetBrains Mono, monospace'
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {lockPublishSettings && (
            <p className="ui-form-help" style={{ marginBottom: '1rem' }}>
              Публикация уже опубликована: режим публикации, дата и статус черновика изменить нельзя.
            </p>
          )}

          <div className="form-group">
            <label htmlFor="tags" className="form-label">
              Теги
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              className="form-input"
              placeholder="цифровая живопись, пейзаж, photoshop (через запятую)"
            />
            <div className="ui-form-help">
              Теги разделяйте запятыми
            </div>
          </div>

          <div className="ui-actions-row" style={{ marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              style={{ flex: 1 }}
              disabled={isLoading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={isLoading}
            >
              {isLoading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditPostModal;

