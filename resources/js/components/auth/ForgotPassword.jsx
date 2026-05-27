import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api';
import Alert from '../common/Alert';
import '../../../css/app.css';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email.trim()) {
      setError('Введите email');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiFetch('/api/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const firstError = data?.errors
          ? Object.values(data.errors)[0]
          : null;
        setError(Array.isArray(firstError) ? firstError[0] : (data?.message || 'Не удалось отправить ссылку для сброса'));
        return;
      }

      setMessage(data?.message || 'Если аккаунт существует, инструкция отправлена на email.');
    } catch (_err) {
      setError('Ошибка соединения с сервером');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="main-content" style={{ maxWidth: '520px', margin: '2rem auto' }}>
      <div className="settings-form-card" style={{ background: '#DEDDD8', border: '1px solid #D4D1CC', borderRadius: '12px', padding: '1.5rem' }}>
        <h1 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '1.4rem', fontFamily: 'JetBrains Mono, monospace' }}>Восстановление пароля</h1>
        <p style={{ color: '#4b5563', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Укажите email, и мы отправим ссылку для сброса пароля.
        </p>

        <Alert type="success" message={message} className="home-alert" />
        <Alert type="error" message={error} className="home-alert" />

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Введите email"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Отправка...' : 'Отправить ссылку'}
          </button>
        </form>

        <div style={{ marginTop: '1rem' }}>
          <Link to="/" className="btn btn-outline">Вернуться на главную</Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
