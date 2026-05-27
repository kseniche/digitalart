import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Alert from '../common/Alert';

function LoginModal({ onClose, onLogin, onSwitchToRegister }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
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

    if (!formData.email) {
      newErrors.email = 'Email обязателен';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email неверного формата';
    }

    if (!formData.password) {
      newErrors.password = 'Пароль обязателен';
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
      const result = await login(formData);
      
      if (result.success) {
        onLogin();
      } else {
        const nextErrors = { general: result.error || 'Ошибка при входе. Проверьте данные.' };
        if (result.errors && typeof result.errors === 'object') {
          Object.assign(nextErrors, result.errors);
        }
        setErrors(nextErrors);
      }
    } catch (error) {
      setErrors({ general: 'Ошибка при входе. Проверьте данные.' });
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
          Вход в аккаунт
        </h2>

        <Alert type="error" message={errors.general || ''} className="home-alert" />

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              placeholder="Введите ваш email"
            />
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
              placeholder="Введите ваш пароль"
            />
            {errors.password && <div className="form-error">{errors.password}</div>}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: '1rem' }}
            disabled={isLoading}
          >
            {isLoading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/forgot-password');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#7B0000',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontFamily: 'JetBrains Mono, monospace'
            }}
          >
            Забыли пароль?
          </button>
        </div>

        <div style={{ textAlign: 'center' }}>
          <span style={{ color: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }}>Нет аккаунта? </span>
          <button
            onClick={onSwitchToRegister}
            style={{
              background: 'none',
              border: 'none',
              color: '#7B0000',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontFamily: 'JetBrains Mono, monospace'
            }}
          >
            Зарегистрироваться
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginModal;
