import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { apiFetch } from '../api';
import {
  formatPhoneMask,
  normalizePhoneStorage,
  normalizeWebsiteUrl,
  phoneValidationMessage,
  phoneInputHint,
  validatePhoneClient,
  validateWebsiteClient,
  websiteValidationMessage,
} from '../utils/profileFields';
import DeleteProfileModal from './modals/DeleteProfileModal';
import Alert from './common/Alert';
import '../../css/app.css';

/** Согласовано с App\Rules\PersonNameLetters */
const PERSON_NAME_LETTERS_RE = /^[\p{L}]+(?:[ \u0027\u2019\-][\p{L}]+)*$/u;

function Settings() {
  const navigate = useNavigate();
  const { user, isAuthenticated, refreshUserFromServer, logout } = useAuth();
  const toast = useToast().toast;
  const [form, setForm] = useState({
    name: '',
    user_surname: '',
    username: '',
    email: '',
    email_notifications_enabled: true,
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

  // Форма смены пароля
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordMessage, setPasswordMessage] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }
    // Для настроек используем только приватный endpoint текущего пользователя.
    (async () => {
      try {
        const res = await apiFetch('/api/profile', { headers: { 'Accept': 'application/json' } });
        if (res.ok) {
          const data = await res.json();
          const next = {
            name: data.name || '',
            user_surname: data.user_surname || '',
            username: data.username || '',
            email: data.email || '',
            email_notifications_enabled:
              typeof data.email_notifications_enabled === 'boolean'
                ? data.email_notifications_enabled
                : true,
            country: data.country || '',
            website: data.website || '',
            bio: data.bio || '',
            phone: data.phone ? formatPhoneMask(data.phone) : '',
            avatar: data.avatar || '',
          };
          setForm(next);
          setAvatarPreview(next.avatar);
        }
      } catch (e) {
        const msg = 'Не удалось загрузить данные профиля';
        setError(msg);
        toast.error(msg);
      }
    })();
  }, [isAuthenticated, navigate, user]);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePhone = (phone) => validatePhoneClient(phone);

  const validateWebsite = (website) => validateWebsiteClient(website);

  const updateField = (field, value) => {
    setError('');
    setSuccess('');
    setFieldErrors(prev => ({ ...prev, [field]: '' }));
    setForm(prev => ({ ...prev, [field]: value }));

    // Валидация в реальном времени
    if (field === 'email' && value && !validateEmail(value)) {
      setFieldErrors(prev => ({ ...prev, email: 'Некорректный формат электронной почты' }));
    }
    if (field === 'phone' && value && !validatePhone(value)) {
      setFieldErrors(prev => ({ ...prev, phone: phoneValidationMessage() }));
    }
    if (field === 'website' && value && !validateWebsite(value)) {
      setFieldErrors(prev => ({ ...prev, website: websiteValidationMessage() }));
    }
    if (field === 'username' && value && value.length < 3) {
      setFieldErrors(prev => ({ ...prev, username: 'Никнейм должен содержать минимум 3 символа' }));
    }
    if (field === 'name' && value && value.trim() && !PERSON_NAME_LETTERS_RE.test(value.trim())) {
      setFieldErrors(prev => ({
        ...prev,
        name: 'Имя может содержать только буквы; части разделяйте пробелом, дефисом или апострофом (например, Анна-Мария, Жан-Пьер)',
      }));
    }
    if (field === 'user_surname' && value && value.trim() && !PERSON_NAME_LETTERS_RE.test(value.trim())) {
      setFieldErrors(prev => ({
        ...prev,
        user_surname: "Фамилия может содержать только буквы; части разделяйте пробелом, дефисом или апострофом (например, Салтыков-Щедрин, О'Коннор)",
      }));
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
      errors.email = 'Некорректный формат электронной почты';
    }
    if (form.phone && !validatePhone(form.phone)) {
      errors.phone = phoneValidationMessage();
    }
    if (form.website && !validateWebsite(form.website)) {
      errors.website = websiteValidationMessage();
    }
    if (form.username && form.username.length < 3) {
      errors.username = 'Никнейм должен содержать минимум 3 символа';
    }
    if (!form.name || form.name.trim() === '') {
      errors.name = 'Имя обязательно для заполнения';
    } else if (!PERSON_NAME_LETTERS_RE.test(form.name.trim())) {
      errors.name = 'Имя может содержать только буквы; части разделяйте пробелом, дефисом или апострофом (например, Анна-Мария, Жан-Пьер)';
    }

    if (form.user_surname && form.user_surname.trim() !== '' && !PERSON_NAME_LETTERS_RE.test(form.user_surname.trim())) {
      errors.user_surname = "Фамилия может содержать только буквы; части разделяйте пробелом, дефисом или апострофом (например, Салтыков-Щедрин, О'Коннор)";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const msg = 'Пожалуйста, исправьте ошибки в форме';
      setError(msg);
      toast.error(msg);
      return;
    }

    try {
      setIsSaving(true);
      
      // Создаем объект с данными
      const data = {
        country: form.country || '',
        website: form.website ? normalizeWebsiteUrl(form.website) : '',
        bio: form.bio || '',
        name: form.name || '',
        user_surname: form.user_surname || '',
        username: form.username || '',
        email: form.email || '',
        phone: form.phone ? normalizePhoneStorage(form.phone) : '',
        email_notifications_enabled: !!form.email_notifications_enabled,
      };
  
      // Обновляем основные данные профиля
      const res = await apiFetch('/api/profile', {
        method: 'PUT',
        headers: { 
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
          if (res.status === 422 && errorData.errors && typeof errorData.errors === 'object') {
            const flat = {};
            Object.keys(errorData.errors).forEach(key => {
              const v = errorData.errors[key];
              flat[key] = Array.isArray(v) ? v[0] : v;
            });
            setFieldErrors(flat);
          }
        } catch (e) {
          // ignore
        }
        setError(errorMessage);
        toast.error(errorMessage);
        setIsSaving(false);
        return;
      }
      setFieldErrors({});
      
      const result = await res.json();
      
      // Если есть новый аватар, обновляем его отдельно
      if (form.avatar_file) {
        const avatarFormData = new FormData();
        avatarFormData.append('avatar', form.avatar_file);
        
        const avatarRes = await apiFetch('/api/profile/avatar', {
          method: 'POST',
          headers: { 
            'Accept': 'application/json',
          },
          body: avatarFormData
        });
        
        if (!avatarRes.ok) {
          const msg = 'Профиль обновлён, но не удалось загрузить аватар';
          setError(msg);
          toast.error(msg);
          return;
        }
      }
      
      const successMsg = 'Изменения успешно сохранены';
      setSuccess(successMsg);
      toast.success(successMsg);
      await refreshUserFromServer();
      
    } catch (e) {
      const msg = e.message || 'Ошибка сохранения';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Отдельная функция для обновления аватара
  const updateAvatarSeparately = async (file) => {
    const avatarFormData = new FormData();
    avatarFormData.append('avatar', file);
    
    const res = await apiFetch('/api/profile/avatar', {
      method: 'POST',
      headers: { 
        'Accept': 'application/json',
      },
      body: avatarFormData
    });
    
    if (res.ok) {
      await refreshUserFromServer();
    }
  };

  const updatePasswordField = (field, value) => {
    setPasswordMessage('');
    setPasswordErrors(prev => ({ ...prev, [field]: '' }));
    setPasswordForm(prev => ({ ...prev, [field]: value }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage('');
    setPasswordErrors({});

    const errors = {};
    if (!passwordForm.current_password.trim()) {
      errors.current_password = 'Введите текущий пароль';
    }
    if (!passwordForm.password) {
      errors.password = 'Введите новый пароль';
    } else if (passwordForm.password.length < 8) {
      errors.password = 'Новый пароль должен содержать минимум 8 символов';
    }
    if (passwordForm.password !== passwordForm.password_confirmation) {
      errors.password_confirmation = 'Пароли не совпадают';
    }
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    try {
      setIsChangingPassword(true);
      const res = await apiFetch('/api/user/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          password: passwordForm.password,
          password_confirmation: passwordForm.password_confirmation,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 422 && data.errors && typeof data.errors === 'object') {
          const flat = {};
          Object.keys(data.errors).forEach(key => {
            const v = data.errors[key];
            flat[key] = Array.isArray(v) ? v[0] : v;
          });
          setPasswordErrors(flat);
          setPasswordMessage(data.message || 'Ошибка валидации');
        } else {
          setPasswordMessage(data.message || 'Не удалось изменить пароль');
        }
        return;
      }

      setPasswordMessage('Пароль успешно изменён');
      setPasswordForm({ current_password: '', password: '', password_confirmation: '' });
      setPasswordErrors({});
      setTimeout(() => {
        setShowPasswordForm(false);
        setPasswordMessage('');
      }, 2000);
    } catch (e) {
      setPasswordMessage('Ошибка соединения с сервером');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Функция удаления профиля
  const handleDeleteProfile = async () => {
    try {
      setIsDeleting(true);
      setError('');
      
      const res = await apiFetch('/api/profile', {
        method: 'DELETE',
        headers: { 
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
      const msg = e.message || 'Ошибка удаления профиля';
      setError(msg);
      toast.error(msg);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="main-content">
      <div style={{ marginBottom: '2rem' }}>
        <button onClick={() => navigate(-1)} className="btn btn-outline">Назад</button>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '1rem', fontFamily: 'JetBrains Mono, monospace' }}>Настройки профиля</h1>
        <Alert type="error" message={error} className="home-alert" />
        <Alert type="success" message={success} className="home-alert" />

        <div className="settings-form-card" style={{ background: '#DEDDD8', borderRadius: '12px', padding: '1.5rem', border: '1px solid #D4D1CC', display: 'grid', gap: '1rem' }}>
          <div>
            <label className="form-label">Аватар</label>
            <div className="settings-avatar-row" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <img src={avatarPreview || '/default-avatar.svg'} alt="avatar" className="settings-avatar-preview" />
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
            <label className="form-label">Электронная почта</label>
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
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={!!form.email_notifications_enabled}
                onChange={(e) => updateField('email_notifications_enabled', e.target.checked)}
              />
              Уведомления по email включены
            </label>
          </div>
          <div>
            <label className="form-label">Телефон</label>
            <input 
              className="form-input" 
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={form.phone} 
              onChange={e => updateField('phone', formatPhoneMask(e.target.value))}
              placeholder="+7 (900) 123-45-67"
            />
            <div className="ui-form-help">{phoneInputHint()}</div>
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
              onBlur={e => {
                const v = e.target.value.trim();
                if (v && validateWebsite(v)) {
                  updateField('website', normalizeWebsiteUrl(v));
                }
              }}
              placeholder="example.com"
            />
            {fieldErrors.website && <div className="form-error">{fieldErrors.website}</div>}
          </div>
          <div>
            <label className="form-label">О себе</label>
            <textarea className="form-input" rows={5} value={form.bio} onChange={e => updateField('bio', e.target.value)} />
          </div>

          {/* Кнопка и форма смены пароля */}
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #D4D1CC' }}>
            {!showPasswordForm ? (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setShowPasswordForm(true);
                  setPasswordForm({ current_password: '', password: '', password_confirmation: '' });
                  setPasswordErrors({});
                  setPasswordMessage('');
                }}
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                Изменить пароль
              </button>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ fontWeight: '600', color: '#111827', fontFamily: 'JetBrains Mono, monospace' }}>Смена пароля</div>
                {passwordMessage && (
                  <div
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      fontFamily: 'JetBrains Mono, monospace',
                      backgroundColor: passwordMessage.includes('успешно') ? 'rgba(123, 0, 0, 0.08)' : '#f5f5f5',
                      color: '#7B0000',
                    }}
                  >
                    {passwordMessage}
                  </div>
                )}
                <form onSubmit={handleChangePassword}>
                  <div>
                    <label className="form-label">Текущий пароль</label>
                    <input
                      type="password"
                      className="form-input"
                      value={passwordForm.current_password}
                      onChange={e => updatePasswordField('current_password', e.target.value)}
                      placeholder="Введите текущий пароль для подтверждения"
                      autoComplete="current-password"
                    />
                    {passwordErrors.current_password && (
                      <div className="form-error">
                        {Array.isArray(passwordErrors.current_password) ? passwordErrors.current_password[0] : passwordErrors.current_password}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="form-label">Новый пароль</label>
                    <input
                      type="password"
                      className="form-input"
                      value={passwordForm.password}
                      onChange={e => updatePasswordField('password', e.target.value)}
                      placeholder="Минимум 8 символов"
                      autoComplete="new-password"
                    />
                    {passwordErrors.password && (
                      <div className="form-error">
                        {Array.isArray(passwordErrors.password) ? passwordErrors.password[0] : passwordErrors.password}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="form-label">Подтверждение пароля</label>
                    <input
                      type="password"
                      className="form-input"
                      value={passwordForm.password_confirmation}
                      onChange={e => updatePasswordField('password_confirmation', e.target.value)}
                      placeholder="Повторите новый пароль"
                      autoComplete="new-password"
                    />
                    {passwordErrors.password_confirmation && (
                      <div className="form-error">
                        {Array.isArray(passwordErrors.password_confirmation) ? passwordErrors.password_confirmation[0] : passwordErrors.password_confirmation}
                      </div>
                    )}
                  </div>
                  <div className="settings-password-actions" style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isChangingPassword}
                      style={{ fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      {isChangingPassword ? 'Сохранение...' : 'Изменить пароль'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => {
                        setShowPasswordForm(false);
                        setPasswordForm({ current_password: '', password: '', password_confirmation: '' });
                        setPasswordErrors({});
                        setPasswordMessage('');
                      }}
                      disabled={isChangingPassword}
                      style={{ fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      Отмена
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          <div className="settings-danger-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid #7B0000' }}>
            <button 
              className="btn btn-danger"
              style={{ opacity: isDeleting ? 0.6 : 1 }}
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


