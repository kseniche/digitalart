import React, { useState, useEffect } from 'react';

function EditPostModal({ post, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (post) {
      setFormData({
        title: post.post_title || '',
        description: post.post_content || '',
        tags: post.tags ? (Array.isArray(post.tags) ? post.tags.join(', ') : post.tags) : ''
      });
    }
  }, [post]);

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
      setErrors({ general: error.message || 'Ошибка при сохранении изменений' });
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

        {errors.general && (
          <div style={{ 
            color: '#7B0000', 
            backgroundColor: '#f5f5f5', 
            padding: '0.75rem', 
            borderRadius: '8px', 
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            {errors.general}
          </div>
        )}

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
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem', 
              color: '#6b7280', 
              marginTop: '0.25rem'
            }}>
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
            <div style={{ 
              fontSize: '0.75rem', 
              color: '#6b7280',
              marginTop: '0.25rem'
            }}>
              Обязательное поле
            </div>
            {errors.description && (
              <div className="form-error" style={{ marginTop: '0.5rem' }}>
                {errors.description}
              </div>
            )}
          </div>

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
            <div style={{ 
              fontSize: '0.75rem', 
              color: '#6b7280',
              marginTop: '0.25rem'
            }}>
              Теги разделяйте запятыми
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            gap: '1rem',
            marginTop: '1.5rem'
          }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
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

