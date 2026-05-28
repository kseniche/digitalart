import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useGoBack } from '../hooks/useGoBack';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { apiFetch } from '../api';
import '../../css/app.css';

const MAX_MEDIA_SIZE_MB = 50;
const MAX_MEDIA_SIZE_BYTES = MAX_MEDIA_SIZE_MB * 1024 * 1024;

const API_FIELD_TO_FORM = {
  media_file: 'image',
  title: 'title',
  description: 'description',
  category_id: 'category_id',
  tags: 'tags',
};

function humanizeValidationMessage(raw) {
  if (!raw || typeof raw !== 'string') {
    return 'Проверьте правильность заполнения формы';
  }
  const msg = raw.trim();
  const key = msg.toLowerCase().replace(/\s+/g, '');
  if (key.includes('validation.uploaded') || key.includes('uploaded')) {
    return 'Файл загружен некорректно. Попробуйте загрузить файл ещё раз или уменьшите размер (до 50 МБ).';
  }
  if (key.includes('validation.required') || (key.includes('required') && key.includes('validation'))) {
    return 'Заполните обязательное поле.';
  }
  if (key.includes('validation.max')) {
    return 'Превышен допустимый размер или длина поля.';
  }
  if (/^validation\.[a-z0-9_.]+$/i.test(msg)) {
    return 'Проверьте правильность заполнения формы';
  }
  return msg;
}

function mapApiValidationErrors(apiErrors) {
  const mapped = {};
  if (!apiErrors || typeof apiErrors !== 'object') {
    return mapped;
  }
  Object.entries(apiErrors).forEach(([apiKey, value]) => {
    const formKey = API_FIELD_TO_FORM[apiKey] || apiKey;
    const first = Array.isArray(value) ? value[0] : value;
    mapped[formKey] = humanizeValidationMessage(first);
  });
  return mapped;
}

function CreatePost() {
  const navigate = useNavigate();
  const location = useLocation();
  const goBack = useGoBack('/');
  const { isAuthenticated, user } = useAuth();
  const toast = useToast().toast;
  const submitAsDraftRef = useRef(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: '',
    category_id: '',
    image: null,
    publish_mode: 'now',
    published_at: ''
  });
  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [mediaType, setMediaType] = useState('image');
  useEffect(() => {
    apiFetch('/api/categories')
      .then((r) => r.ok ? r.json() : [])
      .then((list) => setCategories(Array.isArray(list) ? list : []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Проверяем размер файла (50MB максимум, синхронизировано с backend).
      if (file.size > MAX_MEDIA_SIZE_BYTES) {
        setErrors(prev => ({
          ...prev,
          image: `Размер файла не должен превышать ${MAX_MEDIA_SIZE_MB} МБ`
        }));
        return;
      }

      // Проверяем тип файла
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
      if (!validTypes.includes(file.type)) {
        setErrors(prev => ({
          ...prev,
          image: 'Допустимые форматы: JPEG, PNG, GIF, WebP, MP4, WebM, MOV'
        }));
        return;
      }

      setFormData(prev => ({
        ...prev,
        image: file
      }));
      
      // Очищаем ошибку изображения
      if (errors.image) {
        setErrors(prev => ({
          ...prev,
          image: ''
        }));
      }
      
      // Создаем превью изображения
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
      setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Название обязательно';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Название не должно превышать 100 символов';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Описание обязательно';
    }

    if (!formData.image) {
      newErrors.image = 'Изображение обязательно';
    }

    if (!formData.category_id) {
      newErrors.category_id = 'Выберите категорию';
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
      // Создаем FormData для отправки файла
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('tags', formData.tags);
      formDataToSend.append('category_id', formData.category_id);
      formDataToSend.append('is_draft', submitAsDraftRef.current ? '1' : '0');
      formDataToSend.append('media_type', mediaType);
      if (!submitAsDraftRef.current && formData.publish_mode === 'schedule' && formData.published_at) {
        const dt = new Date(formData.published_at);
        if (dt.getTime() > Date.now()) {
          formDataToSend.append('published_at', dt.toISOString());
        }
      }
      
      // Обязательно добавляем файл
      if (formData.image) {
        formDataToSend.append('media_file', formData.image);
      }

      const response = await apiFetch('/api/posts', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          
        },
        body: formDataToSend
      });

      if (!response.ok) {
        let errorMessage = 'Ошибка при создании поста';
        let fieldErrors = {};
        try {
          const errorData = await response.json();
          if (response.status === 422) {
            errorMessage = 'Проверьте правильность заполнения формы';
            fieldErrors = mapApiValidationErrors(errorData.errors);
          } else {
            errorMessage = humanizeValidationMessage(errorData.message) || errorMessage;
          }
        } catch (parseError) {
          // ignore
        }
        setErrors({ general: errorMessage, ...fieldErrors });
        setIsLoading(false);
        return;
      }

      const result = await response.json();
      toast.success(result?.message || 'Публикация отправлена на модерацию');
      
      if (submitAsDraftRef.current && user?.id) {
        navigate(`/profile/${user.id}`, { replace: true });
      } else if (result.id || result.post?.id) {
        const postId = result.id || result.post.id;
        navigate(`/post/${postId}`, { state: { from: `${location.pathname}${location.search}` } });
      } else {
        navigate('/');
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, general: error.message || 'Ошибка при создании поста. Попробуйте еще раз.' }));
    } finally {
      setIsLoading(false);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, image: null }));
    setImagePreview(null);
    // Очищаем input file
    const fileInput = document.getElementById('image-upload');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  return (
    <div className="main-content">
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={goBack}
          className="ui-page-back"
          type="button"
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          ← Назад
        </button>
      </div>

      <div className="create-post-grid ui-two-col">
        {/* Левая панель - загрузка медиа */}
        <div>
          <h2 className="ui-section-title">Медиа</h2>
          
          <div className="ui-panel" style={{ textAlign: 'center' }}>
            {/* Input для загрузки файла - всегда в DOM */}
            <input
              id="image-upload"
              type="file"
              accept="image/jpeg,image/png,image/jpg,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
              onChange={handleImageChange}
              style={{ display: 'none' }}
            />
            
            {imagePreview ? (
              <div>
                <div style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#D4D1CC',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  minHeight: '200px',
                  maxHeight: '500px',
                  overflow: 'hidden'
                }}>
                  {mediaType === 'video' ? (
                    <video
                      src={imagePreview}
                      controls
                      style={{
                        width: '100%',
                        maxHeight: '500px',
                        objectFit: 'contain',
                        borderRadius: '8px'
                      }}
                    />
                  ) : (
                    <img
                      src={imagePreview}
                      alt="Превью"
                      style={{
                        width: 'auto',
                        height: 'auto',
                        maxWidth: '100%',
                        maxHeight: '500px',
                        objectFit: 'contain',
                        borderRadius: '8px'
                      }}
                    />
                  )}
                </div>
                <div style={{ 
                  display: 'flex', 
                  gap: '1rem',
                  justifyContent: 'center'
                }}>
                  <button
                    onClick={() => document.getElementById('image-upload').click()}
                    className="btn btn-outline"
                  >
                    Заменить
                  </button>
                  <button
                    onClick={removeImage}
                    className="btn btn-outline"
                  >
                    Удалить
                  </button>
                </div>
                {formData.image && (
                  <div style={{ 
                    marginTop: '0.5rem',
                    fontSize: '0.875rem',
                    color: '#6b7280'
                  }}>
                    Файл: {formData.image.name} ({(formData.image.size / 1024 / 1024).toFixed(2)} МБ)
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div 
                  className={`ui-upload-zone${errors.image ? ' ui-upload-zone--error' : ''}`}
                  onClick={() => document.getElementById('image-upload').click()}
                >
                  <div style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem', color: '#111827', fontFamily: 'JetBrains Mono, monospace' }}>
                    Загрузить медиа
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.875rem', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace' }}>
                    Нажмите для выбора файла<br />
                    JPEG, PNG, GIF, WebP, MP4, WebM, MOV до 50 МБ
                  </div>
                </div>
              </div>
            )}
            
            {errors.image && (
              <div className="form-error ui-error-box" style={{ marginTop: '1rem' }}>
                {errors.image}
              </div>
            )}
            <p style={{ marginTop: '0.75rem', textAlign: 'center', fontSize: '0.8125rem' }}>
              <Link
                to="/community-rules#publication-rules"
                style={{ color: '#6b7280', textDecoration: 'underline', textUnderlineOffset: '2px' }}
              >
                Правила публикации
              </Link>
            </p>
          </div>
        </div>

        {/* Правая панель - форма */}
        <div>
          <h2 className="ui-section-title">Информация о работе</h2>
          
          <div className="ui-panel">
            {errors.general && (
              <div className="ui-error-box" style={{ marginBottom: '1rem', textAlign: 'center' }}>
                {errors.general}
              </div>
            )}

            <form id="create-post-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="title" className="form-label">
                  Название работы *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className={`form-input ${errors.title ? 'error' : ''}`}
                  placeholder="Введите название работы"
                  maxLength={100}
                />
                <div className="ui-form-help ui-form-help-row">
                  <span>Обязательное поле</span>
                  <span>{formData.title.length}/100</span>
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
                  placeholder="Опишите вашу работу: техника, материалы, идея..."
                  rows={6}
                  style={{ resize: 'vertical' }}
                />
                <div className="ui-form-help">
                  Обязательное поле. Поддерживается Markdown: <strong>**жирный**</strong>, <em>*курсив*</em>, - список, [ссылка](url).
                </div>
                {errors.description && (
                  <div className="form-error" style={{ marginTop: '0.5rem' }}>
                    {errors.description}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="category_id" className="form-label">
                  Категория *
                </label>
                <select
                  id="category_id"
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  className={`form-input ${errors.category_id ? 'error' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">— Выберите категорию —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {errors.category_id && (
                  <div className="form-error" style={{ marginTop: '0.5rem' }}>
                    {errors.category_id}
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
                <div className="ui-form-help">
                  Теги помогут другим найти вашу работу. Разделяйте запятыми.
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
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

              <div className="ui-action-buttons">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="btn btn-outline"
                  style={{ flex: '1 1 100px' }}
                  disabled={isLoading}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={() => { submitAsDraftRef.current = true; document.getElementById('create-post-form').requestSubmit(); }}
                  className="btn btn-outline"
                  style={{ flex: '1 1 100px' }}
                  disabled={isLoading}
                >
                  {isLoading ? 'Сохранение...' : 'Сохранить как черновик'}
                </button>
                <button
                  type="submit"
                  onClick={() => { submitAsDraftRef.current = false; }}
                  className="btn btn-primary"
                  style={{ flex: '1 1 100px' }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span style={{ marginRight: '0.5rem' }}></span>
                      Публикация...
                    </>
                  ) : (
                    <>
                      <span style={{ marginRight: '0.5rem' }}></span>
                      Опубликовать
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreatePost;