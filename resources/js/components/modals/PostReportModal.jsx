import React, { useEffect, useState } from 'react';
import { apiFetchLocal as apiFetch } from '../../api';
import CharCounter from '../common/CharCounter';
import { FIELD_LIMITS } from '../../constants/fieldLimits';
import { mapApiValidationErrors } from '../../utils/apiValidation';
import { validateMaxLength } from '../../utils/fieldValidation';

const OTHER_TEXT_LIMIT = FIELD_LIMITS.postReport.otherText;

function PostReportModal({ open, postId, onClose, onSuccess }) {
  const [reasons, setReasons] = useState([]);
  const [reason, setReason] = useState('');
  const [otherText, setOtherText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setReason('');
    setOtherText('');
    setError('');
    apiFetch('/api/post-report-reasons')
      .then((r) => (r.ok ? r.json() : { reasons: [] }))
      .then((data) => setReasons(data.reasons || []))
      .catch(() => setReasons([]));
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!reason) {
      setError('Выберите причину жалобы');
      return;
    }
    if (reason === 'other' && !otherText.trim()) {
      setError('Опишите причину жалобы');
      return;
    }
    const otherMax = validateMaxLength(otherText, OTHER_TEXT_LIMIT.max, 'Описание жалобы');
    if (otherMax) {
      setError(otherMax);
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch(`/api/posts/${postId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ reason, other_text: otherText.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 422 && data.errors) {
          const mapped = mapApiValidationErrors(data.errors);
          setError(mapped.other_text || data.message || 'Проверьте форму жалобы');
        } else {
          setError(data.message || 'Не удалось отправить жалобу');
        }
        return;
      }
      onSuccess?.(data.message);
      onClose?.();
    } catch {
      setError('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Закрыть">×</button>
        <h2 className="ui-modal-title">Пожаловаться на публикацию</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Причина</label>
            <select className="form-input" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Выберите причину</option>
              {reasons.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          {reason === 'other' && (
            <div className="form-group">
              <label className="form-label">Описание</label>
              <textarea
                className="form-input"
                rows={3}
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                maxLength={OTHER_TEXT_LIMIT.max}
              />
              <CharCounter value={otherText} max={OTHER_TEXT_LIMIT.max} required={false} hint="Пояснение к жалобе" />
            </div>
          )}
          {error && <div className="form-error" style={{ marginBottom: '1rem' }}>{error}</div>}
          <div className="ui-actions-row">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>Отмена</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Отправка…' : 'Отправить жалобу'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PostReportModal;
