import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiFetch } from '../../api';
import Alert from '../common/Alert';
import '../../../css/app.css';

function ResetPassword() {
  const location = useLocation();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [email, setEmail] = useState(query.get('email') || '');
  const [token, setToken] = useState(query.get('token') || '');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!token.trim() || !email.trim() || !password || !passwordConfirmation) {
      setError('Заполните все поля');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiFetch('/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          token: token.trim(),
          email: email.trim(),
          password,
          password_confirmation: passwordConfirmation,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const firstError = data?.errors
          ? Object.values(data.errors)[0]
          : null;
        setError(Array.isArray(firstError) ? firstError[0] : (data?.message || 'Не удалось сбросить пароль'));
        return;
      }

      setMessage(data?.message || 'Пароль успешно сброшен');
      setPassword('');
      setPasswordConfirmation('');
    } catch (_err) {
      setError('Ошибка соединения с сервером');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="main-content" style={{ maxWidth: '520px', margin: '2rem auto' }}>
      <div className="settings-form-card" style={{ background: '#DEDDD8', border: '1px solid #D4D1CC', borderRadius: '12px', padding: '1.5rem' }}>
        <h1 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '1.4rem', fontFamily: 'JetBrains Mono, monospace' }}>Сброс пароля</h1>
        <p style={{ color: '#4b5563', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Введите токен и новый пароль.
        </p>

        <Alert type="success" message={message} className="home-alert" />
        <Alert type="error" message={error} className="home-alert" />

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="token" className="form-label">Токен</label>
            <input id="token" type="text" className="form-input" value={token} onChange={(e) => setToken(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <input id="email" type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="password" className="form-label">Новый пароль</label>
            <input id="password" type="password" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="passwordConfirmation" className="form-label">Подтверждение пароля</label>
            <input
              id="passwordConfirmation"
              type="password"
              className="form-input"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Сохранение...' : 'Сбросить пароль'}
          </button>
        </form>

        <div style={{ marginTop: '1rem' }}>
          <Link to="/" className="btn btn-outline">Вернуться на главную</Link>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
