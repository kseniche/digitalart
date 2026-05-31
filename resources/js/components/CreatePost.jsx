import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useGoBack } from '../hooks/useGoBack';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { apiFetchLocal as apiFetch } from '../api';
import {
  POST_TAG_MAX_COUNT,
  POST_TAGS_INPUT_MAX,
  validateTagsInput,
} from '../utils/postTagLimits';
import { FIELD_LIMITS } from '../constants/fieldLimits';
import CharCounter from './common/CharCounter';
import { getApiErrorMessage, mapApiValidationErrors } from '../utils/apiValidation';
import {
  isNearLimit,
  isOverLimit,
  validateMaxLength,
  validateRequired,
} from '../utils/fieldValidation';
import MarkdownTextarea from './common/MarkdownTextarea';
import '../../css/app.css';

const MAX_MEDIA_SIZE_MB = 50;
const MAX_MEDIA_SIZE_BYTES = MAX_MEDIA_SIZE_MB * 1024 * 1024;
const TITLE_LIMIT = FIELD_LIMITS.post.title;
const DESCRIPTION_LIMIT = FIELD_LIMITS.post.description;

const API_FIELD_TO_FORM = {
  media_file: 'image',
  title: 'title',
  description: 'description',
  category_id: 'category_id',
  tags: 'tags',
};

function CreatePost() {
  const navigate = useNavigate();
  const location = useLocation();
  const goBack = useGoBack('/');
  const { isAuthenticated, user } = useAuth();
  const toast = useToast().toast;
  const submitAsDraftRef = useRef(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
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
      const validTypes = [
        'image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm', 'video/quicktime', 'video/x-mp4', 'video/x-m4v', 'application/mp4',
      ];
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const videoExts = ['mp4', 'webm', 'mov', 'm4v'];
      const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
      const typeOk = validTypes.includes(file.type)
        || (file.type === '' && (videoExts.includes(ext) || imageExts.includes(ext)))
        || (file.type === 'application/octet-stream' && (videoExts.includes(ext) || imageExts.includes(ext)));
      if (!typeOk) {
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
      const isVideo = file.type.startsWith('video/')
        || videoExts.includes(ext)
        || (file.type === 'application/mp4' || (file.type === 'application/octet-stream' && ext === 'mp4'));
      setMediaType(isVideo ? 'video' : 'image');
    }
  };

  const validateForm = () => {
    const newErrors = {};

    const titleRequired = validateRequired(formData.title, 'Название');
    if (titleRequired) {
      newErrors.title = titleRequired;
    } else {
      const titleMax = validateMaxLength(formData.title, TITLE_LIMIT.max, 'Название');
      if (titleMax) newErrors.title = titleMax;
    }

    const descRequired = validateRequired(formData.description, 'Описание');
    if (descRequired) {
      newErrors.description = descRequired;
    } else {
      const descMax = validateMaxLength(formData.description, DESCRIPTION_LIMIT.max, 'Описание');
      if (descMax) newErrors.description = descMax;
    }

    if (!formData.image) {
      newErrors.image = 'Изображение обязательно';
    }

    if (!formData.category_id) {
      newErrors.category_id = 'Выберите категорию';
    }

    const tagCheck = validateTagsInput(formData.tags);
    if (!tagCheck.isValid) {
      Object.assign(newErrors, tagCheck.errors);
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
        let errorMessage = 'Не удалось создать публикацию';
        let fieldErrors = {};
        try {
          const errorData = await response.json();
          errorMessage = getApiErrorMessage(response, errorData, errorMessage);
          if (response.status === 422 && errorData.errors) {
            fieldErrors = mapApiValidationErrors(errorData.errors, API_FIELD_TO_FORM);
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
    <div className="main-content create-post-page">
      <div className="create-post-page__back-row" style={{ marginBottom: '2rem' }}>
        <button
          onClick={goBack}
          className="ui-page-back"
          type="button"
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          ← Назад
        </button>
      </div>

      <div className="create-post-grid ui-two-col create-post-layout">
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
                <div className="create-post-media-actions">
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
                  maxLength={TITLE_LIMIT.max}
                />
                <CharCounter
                  value={formData.title}
                  max={TITLE_LIMIT.max}
                  min={TITLE_LIMIT.min}
                  required
                />
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
                <MarkdownTextarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  error={!!errors.description}
                  placeholder="Опишите вашу работу: техника, материалы, идея..."
                  rows={6}
                  helpText={null}
                  maxLength={DESCRIPTION_LIMIT.max}
                />
                <CharCounter
                  value={formData.description}
                  max={DESCRIPTION_LIMIT.max}
                  min={DESCRIPTION_LIMIT.min}
                  required
                />
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
                  maxLength={POST_TAGS_INPUT_MAX}
                  placeholder="цифровая живопись, пейзаж, photoshop (через запятую)"
                  aria-describedby="tags-help tags-counter"
                />
                <div className="ui-form-help" id="tags-help">
                  До {POST_TAG_MAX_COUNT} тегов через запятую. Теги помогут другим найти вашу работу.
                </div>
                <div
                  id="tags-counter"
                  className={`ui-form-help ui-form-help-row${
                    (() => {
                      const { charCount } = validateTagsInput(formData.tags);
                      if (isOverLimit(charCount, POST_TAGS_INPUT_MAX)) return ' char-counter--over';
                      if (isNearLimit(charCount, POST_TAGS_INPUT_MAX)) return ' char-counter--warn';
                      return '';
                    })()
                  }`}
                  style={{ marginTop: '0.25rem' }}
                  aria-live="polite"
                >
                  {(() => {
                    const { tagCount, charCount } = validateTagsInput(formData.tags);
                    const tagWarn = tagCount / POST_TAG_MAX_COUNT >= 0.9 && tagCount <= POST_TAG_MAX_COUNT;
                    return (
                      <span>
                        Тегов: {tagCount} / {POST_TAG_MAX_COUNT}
                        {tagWarn ? ' · почти достигнут лимит' : ''}
                        {' · '}
                        {charCount} / {POST_TAGS_INPUT_MAX} символов
                      </span>
                    );
                  })()}
                </div>
                {errors.tags && (
                  <div className="form-error" style={{ marginTop: '0.5rem' }}>
                    {errors.tags}
                  </div>
                )}
              </div>

              <div className="form-group form-group--publish" style={{ marginTop: '1rem' }}>
                <span className="form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Публикация</span>
                <div className="publish-options">
                  <label className="publish-option">
                    <input
                      type="radio"
                      name="publish_mode"
                      checked={formData.publish_mode === 'now'}
                      onChange={() => setFormData(prev => ({ ...prev, publish_mode: 'now' }))}
                    />
                    <span className="publish-option__label publish-option__label--full">Опубликовать сразу</span>
                    <span className="publish-option__label publish-option__label--short">Сразу</span>
                  </label>
                  <label className="publish-option">
                    <input
                      type="radio"
                      name="publish_mode"
                      checked={formData.publish_mode === 'schedule'}
                      onChange={() => setFormData(prev => ({ ...prev, publish_mode: 'schedule' }))}
                    />
                    <span className="publish-option__label publish-option__label--full">Запланировать на дату</span>
                    <span className="publish-option__label publish-option__label--short">По дате</span>
                  </label>
                  {formData.publish_mode === 'schedule' && (
                    <input
                      type="datetime-local"
                      name="published_at"
                      value={formData.published_at}
                      min={new Date().toISOString().slice(0, 16)}
                      onChange={handleChange}
                      className="form-input create-post-datetime"
                    />
                  )}
                </div>
              </div>

              <div className="ui-action-buttons ui-action-buttons--desktop">
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
                  {isLoading ? 'Публикация...' : 'Опубликовать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="form-action-bar form-action-bar--mobile" role="toolbar" aria-label="Действия публикации">
        <button
          type="button"
          className="form-action-bar__icon-btn"
          onClick={goBack}
          aria-label="Назад"
        >
          ←
        </button>
        <div className="form-action-bar__menu-wrap">
          <button
            type="button"
            className="form-action-bar__icon-btn"
            onClick={() => setMobileMoreOpen((open) => !open)}
            aria-label="Дополнительные действия"
            aria-expanded={mobileMoreOpen}
          >
            ⋯
          </button>
          {mobileMoreOpen && (
            <div className="form-action-bar__menu" role="menu">
              <button
                type="button"
                role="menuitem"
                className="form-action-bar__menu-item"
                disabled={isLoading}
                onClick={() => {
                  setMobileMoreOpen(false);
                  navigate('/');
                }}
              >
                Отмена
              </button>
              <button
                type="button"
                role="menuitem"
                className="form-action-bar__menu-item"
                disabled={isLoading}
                onClick={() => {
                  setMobileMoreOpen(false);
                  submitAsDraftRef.current = true;
                  document.getElementById('create-post-form').requestSubmit();
                }}
              >
                {isLoading ? 'Сохранение...' : 'Черновик'}
              </button>
            </div>
          )}
        </div>
        <button
          type="submit"
          form="create-post-form"
          className="btn btn-primary form-action-bar__primary"
          onClick={() => { submitAsDraftRef.current = false; }}
          disabled={isLoading}
        >
          {isLoading ? 'Публикация...' : 'Опубликовать'}
        </button>
      </div>
    </div>
  );
}

export default CreatePost;