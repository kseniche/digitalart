import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DeleteProfileModal from './modals/DeleteProfileModal';
import '../../css/app.css';

function Settings() {
  const navigate = useNavigate();
  const { user, isAuthenticated, refreshUserFromServer, logout } = useAuth();
  const [form, setForm] = useState({
    name: '',
    user_surname: '',
    username: '',
    email: '',
    country: '',
    website: '',
    bio: '',
    phone: '',
    avatar: '',
    avatar_file: null
  });
  const [avatarPreview, setAvatarPreview] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }
    // preload from current user; for profile fields request profile endpoint
    (async () => {
      try {
        const res = await fetch(`/api/profiles/${user.id}`, { headers: { 'Accept': 'application/json' } });
        if (res.ok) {
          const data = await res.json();
          const next = {
            name: data.name || '',
            user_surname: data.user_surname || '',
            username: data.username || '',
            email: data.email || '',
            country: data.country || '',
            website: data.website || '',
            bio: data.bio || '',
            phone: data.phone || '',
            avatar: data.avatar || '',
          };
          setForm(next);
          setAvatarPreview(next.avatar);
        }
      } catch (e) {
        setError('Не удалось загрузить данные профиля');
      }
    })();
  }, [isAuthenticated, navigate, user]);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePhone = (phone) => {
    // Поддержка форматов: +7..., 8..., без символов кроме цифр, пробелов, +, -, ()
    const re = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
    return !phone || re.test(phone.replace(/\s/g, ''));
  };

  const validateWebsite = (website) => {
    if (!website) return true;
    try {
      new URL(website);
      return true;
    } catch {
      return false;
    }
  };

  const updateField = (field, value) => {
    setError('');
    setSuccess('');
    setFieldErrors(prev => ({ ...prev, [field]: '' }));
    setForm(prev => ({ ...prev, [field]: value }));

    // Валидация в реальном времени
    if (field === 'email' && value && !validateEmail(value)) {
      setFieldErrors(prev => ({ ...prev, email: 'Некорректный формат email' }));
    }
    if (field === 'phone' && value && !validatePhone(value)) {
      setFieldErrors(prev => ({ ...prev, phone: 'Некорректный формат телефона' }));
    }
    if (field === 'website' && value && !validateWebsite(value)) {
      setFieldErrors(prev => ({ ...prev, website: 'Некорректный URL (должен начинаться с http:// или https://)' }));
    }
    if (field === 'username' && value && value.length < 3) {
      setFieldErrors(prev => ({ ...prev, username: 'Никнейм должен содержать минимум 3 символа' }));
    }
  };

  const onAvatarFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setForm(prev => ({ ...prev, avatar_file: file }));
      const reader = new FileReader();
      reader.onload = ev => setAvatarPreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const saveAll = async () => {
    setError('');
    setSuccess('');
    setFieldErrors({});
    
    // Валидация перед отправкой
    const errors = {};
    if (form.email && !validateEmail(form.email)) {
      errors.email = 'Некорректный формат email';
    }
    if (form.phone && !validatePhone(form.phone)) {
      errors.phone = 'Некорректный формат телефона';
    }
    if (form.website && !validateWebsite(form.website)) {
      errors.website = 'Некорректный URL';
    }
    if (form.username && form.username.length < 3) {
      errors.username = 'Никнейм должен содержать минимум 3 символа';
    }
    if (!form.name || form.name.trim() === '') {
      errors.name = 'Имя обязательно для заполнения';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Пожалуйста, исправьте ошибки в форме');
      return;
    }

    try {
      setIsSaving(true);
      const token = localStorage.getItem('token');
      
      // Создаем объект с данными
      const data = {
        country: form.country || '',
        website: form.website || '',
        bio: form.bio || '',
        name: form.name || '',
        user_surname: form.user_surname || '',
        username: form.username || '',
        email: form.email || '',
        phone: form.phone || '',
      };
  
      // Обновляем основные данные профиля
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(data)
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = 'Не удалось сохранить изменения';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // ignore
        }
        throw new Error(errorMessage);
      }
      
      const result = await res.json();
      
      // Если есть новый аватар, обновляем его отдельно
      if (form.avatar_file) {
        const avatarFormData = new FormData();
        avatarFormData.append('avatar', form.avatar_file);
        
        const avatarRes = await fetch('/api/profile/avatar', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
          body: avatarFormData
        });
        
        if (!avatarRes.ok) {
          setError('Профиль обновлён, но не удалось загрузить аватар');
          return;
        }
      }
      
      setSuccess('Изменения успешно сохранены');
      await refreshUserFromServer();
      
    } catch (e) {
      setError(e.message || 'Ошибка сохранения');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Отдельная функция для обновления аватара
  const updateAvatarSeparately = async (file, token) => {
    const avatarFormData = new FormData();
    avatarFormData.append('avatar', file);
    
    const res = await fetch('/api/profile/avatar', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: avatarFormData
    });
    
    if (res.ok) {
      await refreshUserFromServer();
    }
  };

  // Функция удаления профиля
  const handleDeleteProfile = async () => {
    try {
      setIsDeleting(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const res = await fetch('/api/profile', {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = 'Не удалось удалить профиль';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // ignore
        }
        throw new Error(errorMessage);
      }
      
      // Успешно удалено - выходим из системы и перенаправляем на главную
      await logout();
      navigate('/');
      
    } catch (e) {
      setError(e.message || 'Ошибка удаления профиля');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="main-content">
      <div style={{ marginBottom: '2rem' }}>
        <button onClick={() => navigate(-1)} className="btn btn-secondary">Назад</button>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '1rem', fontFamily: 'JetBrains Mono, monospace' }}>Настройки профиля</h1>
        {error && <div style={{ color: '#7B0000', background: '#f5f5f5', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontFamily: 'JetBrains Mono, monospace' }}>{error}</div>}
        {success && <div style={{ color: '#065f46', background: '#ecfdf5', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontFamily: 'JetBrains Mono, monospace' }}>{success}</div>}

        <div style={{ background: '#DEDDD8', borderRadius: '12px', padding: '1.5rem', border: '1px solid #D4D1CC', display: 'grid', gap: '1rem' }}>
          <div>
            <label className="form-label">Аватар</label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <img src={avatarPreview || '/default-avatar.svg'} alt="avatar" style={{ width: 64, height: 64, borderRadius: '50%', border: '2px solid #e5e7eb' }} />
              <input type="file" accept="image/*" onChange={onAvatarFileChange} />
            </div>
          </div>

          <div>
            <label className="form-label">Имя <span style={{ color: '#7B0000' }}>*</span></label>
            <input 
              className="form-input" 
              value={form.name} 
              onChange={e => updateField('name', e.target.value)}
              required
            />
            {fieldErrors.name && <div className="form-error">{fieldErrors.name}</div>}
          </div>
          <div>
            <label className="form-label">Фамилия</label>
            <input className="form-input" value={form.user_surname} onChange={e => updateField('user_surname', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Никнейм</label>
            <input 
              className="form-input" 
              value={form.username} 
              onChange={e => updateField('username', e.target.value)}
              placeholder="Минимум 3 символа"
            />
            {fieldErrors.username && <div className="form-error">{fieldErrors.username}</div>}
          </div>
          <div>
            <label className="form-label">Email</label>
            <input 
              className="form-input" 
              type="email" 
              value={form.email} 
              onChange={e => updateField('email', e.target.value)}
              placeholder="example@mail.com"
            />
            {fieldErrors.email && <div className="form-error">{fieldErrors.email}</div>}
          </div>
          <div>
            <label className="form-label">Телефон</label>
            <input 
              className="form-input" 
              value={form.phone} 
              onChange={e => updateField('phone', e.target.value)}
              placeholder="+7 (900) 123-45-67"
            />
            {fieldErrors.phone && <div className="form-error">{fieldErrors.phone}</div>}
          </div>
          <div>
            <label className="form-label">Страна</label>
            <input className="form-input" value={form.country} onChange={e => updateField('country', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Веб-сайт</label>
            <input 
              className="form-input" 
              value={form.website} 
              onChange={e => updateField('website', e.target.value)} 
              placeholder="https://example.com"
            />
            {fieldErrors.website && <div className="form-error">{fieldErrors.website}</div>}
          </div>
          <div>
            <label className="form-label">О себе</label>
            <textarea className="form-input" rows={5} value={form.bio} onChange={e => updateField('bio', e.target.value)} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid #7B0000' }}>
            <button 
              className="btn" 
              style={{ 
                background: '#7B0000', 
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                cursor: isDeleting ? 'not-allowed' : 'pointer',
                opacity: isDeleting ? 0.6 : 1,
                fontFamily: 'JetBrains Mono, monospace'
              }}
              disabled={isDeleting}
              onClick={() => setShowDeleteConfirm(true)}
            >
              {isDeleting ? 'Удаление...' : 'Удалить профиль'}
            </button>
            <button className="btn btn-primary" disabled={isSaving} onClick={saveAll}>{isSaving ? 'Сохранение...' : 'Сохранить'}</button>
          </div>
        </div>

        {/* Модальное окно подтверждения удаления */}
        {showDeleteConfirm && (
          <DeleteProfileModal
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={handleDeleteProfile}
            isDeleting={isDeleting}
          />
        )}
      </div>
    </div>
  );
}

export default Settings;


