import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../../css/app.css';

function CreatePost() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: '',
    image: null
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

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
      // Проверяем размер файла (10MB максимум)
      if (file.size > 10 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          image: 'Размер файла не должен превышать 10MB'
        }));
        return;
      }

      // Проверяем тип файла
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setErrors(prev => ({
          ...prev,
          image: 'Допустимые форматы: JPEG, PNG, GIF, WebP'
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
      const token = localStorage.getItem('token');
      
      // Создаем FormData для отправки файла
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('tags', formData.tags);
      formDataToSend.append('media_type', 'image');
      
      // Обязательно добавляем файл
      if (formData.image) {
        formDataToSend.append('media_file', formData.image);
      }

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          
        },
        body: formDataToSend
      });

      if (!response.ok) {
        let errorMessage = 'Ошибка при создании поста';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
        
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      // Перенаправляем на страницу созданного поста
      if (result.id || result.post?.id) {
        const postId = result.id || result.post.id;
        navigate(`/post/${postId}`);
      } else {
        navigate('/');
      }
    } catch (error) {
      setErrors({ general: error.message || 'Ошибка при создании поста. Попробуйте еще раз.' });
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
          onClick={() => navigate('/')}
          style={{ 
            color: '#7B0000', 
            textDecoration: 'none',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            fontFamily: 'JetBrains Mono, monospace'
          }}
        >
          ← Назад к ленте
        </button>
      </div>

      <div className="create-post-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '3rem'
      }}>
        {/* Левая панель - загрузка медиа */}
        <div>
          <h2 style={{ 
            fontSize: '1.5rem', 
            fontWeight: 'bold', 
            marginBottom: '1.5rem',
            color: '#111827',
            fontFamily: 'JetBrains Mono, monospace'
          }}>
            Медиа
          </h2>
          
          <div style={{
            backgroundColor: '#DEDDD8',
            borderRadius: '12px',
            padding: '2rem',
            border: '1px solid #D4D1CC',
            textAlign: 'center'
          }}>
            {/* Input для загрузки файла - всегда в DOM */}
            <input
              id="image-upload"
              type="file"
              accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
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
                </div>
                <div style={{ 
                  display: 'flex', 
                  gap: '1rem',
                  justifyContent: 'center'
                }}>
                  <button
                    onClick={() => document.getElementById('image-upload').click()}
                    className="btn btn-secondary"
                  >
                    Заменить
                  </button>
                  <button
                    onClick={removeImage}
                    className="btn btn-secondary"
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
                    Файл: {formData.image.name} ({(formData.image.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div 
                  style={{
                    width: '100%',
                    height: '300px',
                    border: '2px dashed #D4D1CC',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s',
                    backgroundColor: errors.image ? '#f5f5f5' : 'transparent',
                  fontFamily: 'JetBrains Mono, monospace'
                  }}
                  onClick={() => document.getElementById('image-upload').click()}
                  onMouseEnter={(e) => e.target.style.borderColor = '#7B0000'}
                  onMouseLeave={(e) => e.target.style.borderColor = errors.image ? '#7B0000' : '#D4D1CC'}
                >
                  <div style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem', color: '#111827', fontFamily: 'JetBrains Mono, monospace' }}>
                    Загрузить изображение
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.875rem', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace' }}>
                    Нажмите для выбора файла<br />
                    JPEG, PNG, GIF, WebP до 10MB
                  </div>
                </div>
              </div>
            )}
            
            {errors.image && (
              <div className="form-error" style={{ 
                marginTop: '1rem',
                padding: '0.75rem',
                backgroundColor: '#f5f5f5',
                border: '1px solid #7B0000',
                borderRadius: '8px',
                color: '#7B0000'
              }}>
                {errors.image}
              </div>
            )}
          </div>
        </div>

        {/* Правая панель - форма */}
        <div>
          <h2 style={{ 
            fontSize: '1.5rem', 
            fontWeight: 'bold', 
            marginBottom: '1.5rem',
            color: '#111827',
            fontFamily: 'JetBrains Mono, monospace'
          }}>
            Информация о работе
          </h2>
          
          <div style={{
            backgroundColor: '#DEDDD8',
            borderRadius: '12px',
            padding: '2rem',
            border: '1px solid #D4D1CC'
          }}>
            {errors.general && (
              <div style={{ 
                color: '#7B0000', 
                backgroundColor: '#f5f5f5', 
                padding: '0.75rem', 
                borderRadius: '8px', 
                marginBottom: '1rem',
                textAlign: 'center',
                border: '1px solid #7B0000'
              }}>
                {errors.general}
              </div>
            )}

            <form onSubmit={handleSubmit}>
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
                <div style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem', 
                  color: '#6b7280', 
                  marginTop: '0.25rem'
                }}>
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
                  Теги помогут другим найти вашу работу. Разделяйте запятыми.
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                gap: '1rem',
                marginTop: '2rem'
              }}>
                <button
                  type="button"
                  onClick={() => navigate('/')}
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