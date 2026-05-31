import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Alert from '../common/Alert';
import CharCounter from '../common/CharCounter';
import { FIELD_LIMITS } from '../../constants/fieldLimits';
import { validateMaxLength } from '../../utils/fieldValidation';

const AUTH_LIMITS = FIELD_LIMITS.auth;

/** Согласовано с App\Rules\PersonNameLetters: буквы; между частями — пробел, дефис или апостроф (' U+0027, ’ U+2019). */
const PERSON_NAME_LETTERS_RE = /^[\p{L}]+(?:[ \u0027\u2019\-][\p{L}]+)*$/u;

function RegisterModal({ onClose, onRegister, onSwitchToLogin }) {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

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

    const first = formData.firstName.trim();
    const last = formData.lastName.trim();

    if (!first) {
      newErrors.firstName = 'Имя обязательно';
    } else if (!PERSON_NAME_LETTERS_RE.test(first)) {
      newErrors.firstName = 'Имя может содержать только буквы; части разделяйте пробелом, дефисом или апострофом (например, Анна-Мария, Жан-Пьер)';
    }

    if (!last) {
      newErrors.lastName = 'Фамилия обязательна';
    } else if (!PERSON_NAME_LETTERS_RE.test(last)) {
      newErrors.lastName = "Фамилия может содержать только буквы; части разделяйте пробелом, дефисом или апострофом (например, Салтыков-Щедрин, О'Коннор)";
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Логин обязателен';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Логин должен содержать минимум 3 символа';
    }

    if (!formData.email) {
      newErrors.email = 'Укажите электронную почту';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Некорректный формат электронной почты';
    }

    if (!formData.password) {
      newErrors.password = 'Пароль обязателен';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Пароль должен содержать минимум 8 символов';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Подтверждение пароля обязательно';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Пароли не совпадают';
    }

    if (!acceptTerms) {
      newErrors.accept_terms = 'Необходимо принять пользовательское соглашение и правила сообщества';
    }

    const firstMax = validateMaxLength(formData.firstName, AUTH_LIMITS.firstName.max, 'Имя');
    if (firstMax) newErrors.firstName = firstMax;
    const lastMax = validateMaxLength(formData.lastName, AUTH_LIMITS.lastName.max, 'Фамилия');
    if (lastMax) newErrors.lastName = lastMax;
    const userMax = validateMaxLength(formData.username, AUTH_LIMITS.username.max, 'Логин');
    if (userMax) newErrors.username = userMax;
    const emailMax = validateMaxLength(formData.email, AUTH_LIMITS.email.max, 'Электронная почта');
    if (emailMax) newErrors.email = emailMax;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    // Преобразуем данные для API
    const apiData = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      username: formData.username,
      email: formData.email,
      password: formData.password,
      passwordConfirmation: formData.confirmPassword,
      accept_terms: true,
    };
    
    try {
      const result = await register(apiData);
      
      if (result.success) {
        onRegister();
      } else {
        const nextErrors = { general: result.error || 'Ошибка при регистрации. Попробуйте еще раз.' };
        if (result.errors && typeof result.errors === 'object') {
          Object.keys(result.errors).forEach(key => {
            const val = result.errors[key];
            const msg = Array.isArray(val) ? val[0] : val;
            const fieldKey = key === 'passwordConfirmation' ? 'confirmPassword' : key;
            nextErrors[fieldKey] = msg;
          });
        }
        setErrors(nextErrors);
      }
    } catch (error) {
      setErrors({ general: 'Ошибка при регистрации. Попробуйте еще раз.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        
        <h2 style={{ marginBottom: '1.5rem', textAlign: 'center', color: '#111827', fontFamily: 'JetBrains Mono, monospace' }}>
          Регистрация
        </h2>

        <Alert type="error" message={errors.general || ''} className="home-alert" />

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="firstName" className="form-label">
                Имя
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="form-input"
                placeholder="Имя"
                maxLength={AUTH_LIMITS.firstName.max}
              />
              <CharCounter value={formData.firstName} max={AUTH_LIMITS.firstName.max} min={AUTH_LIMITS.firstName.min} required />
              {errors.firstName && <div className="form-error">{errors.firstName}</div>}
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="lastName" className="form-label">
                Фамилия
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="form-input"
                placeholder="Фамилия"
                maxLength={AUTH_LIMITS.lastName.max}
              />
              <CharCounter value={formData.lastName} max={AUTH_LIMITS.lastName.max} min={AUTH_LIMITS.lastName.min} required />
              {errors.lastName && <div className="form-error">{errors.lastName}</div>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Логин
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="form-input"
              placeholder="Уникальный логин"
              maxLength={AUTH_LIMITS.username.max}
            />
            <CharCounter value={formData.username} max={AUTH_LIMITS.username.max} min={AUTH_LIMITS.username.min} required />
            {errors.username && <div className="form-error">{errors.username}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Электронная почта
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              placeholder="Введите электронную почту"
              maxLength={AUTH_LIMITS.email.max}
            />
            <CharCounter value={formData.email} max={AUTH_LIMITS.email.max} required={false} />
            {errors.email && <div className="form-error">{errors.email}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Пароль
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              placeholder="Минимум 8 символов"
              maxLength={AUTH_LIMITS.password.max}
            />
            <CharCounter value={formData.password} max={AUTH_LIMITS.password.max} min={AUTH_LIMITS.password.min} required hint="Минимум 8 символов" />
            {errors.password && <div className="form-error">{errors.password}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Подтверждение пароля
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="form-input"
              placeholder="Повторите пароль"
            />
            {errors.confirmPassword && <div className="form-error">{errors.confirmPassword}</div>}
          </div>

          <div className="form-group">
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                lineHeight: 1.5,
              }}
            >
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => {
                  setAcceptTerms(e.target.checked);
                  if (errors.accept_terms) {
                    setErrors((prev) => ({ ...prev, accept_terms: '' }));
                  }
                }}
                style={{ marginTop: '0.2rem' }}
              />
              <span>
                Я принимаю{' '}
                <Link to="/user-agreement" target="_blank" rel="noopener noreferrer" style={{ color: '#7B0000' }} onClick={(e) => e.stopPropagation()}>
                  Пользовательское соглашение
                </Link>
                {' '}и{' '}
                <Link to="/community-rules" target="_blank" rel="noopener noreferrer" style={{ color: '#7B0000' }} onClick={(e) => e.stopPropagation()}>
                  Правила сообщества
                </Link>
                .
              </span>
            </label>
            {errors.accept_terms && <div className="form-error">{errors.accept_terms}</div>}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: '1rem' }}
            disabled={isLoading || !acceptTerms}
          >
            {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>

        <div style={{ textAlign: 'center' }}>
          <span style={{ color: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }}>Уже есть аккаунт? </span>
          <button
            onClick={onSwitchToLogin}
            style={{
              background: 'none',
              border: 'none',
              color: '#7B0000',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontFamily: 'JetBrains Mono, monospace'
            }}
          >
            Войти
          </button>
        </div>
      </div>
    </div>
  );
}

export default RegisterModal;
