import React, { useState } from 'react';

function CommentCard({
  comment,
  tab,
  onConfirm,
  onDelete,
  onDeleteWithWords,
  onUnhide,
  onDismissReports,
  onOpenPost,
}) {
  const [banWords, setBanWords] = useState('');
  const [showBanInput, setShowBanInput] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isDeleted = comment.deleted_at != null;
  const reportsCount = comment.reports_count || 0;

  return (
    <div className={`admin-comment-card ${isDeleted ? 'admin-comment-card--deleted' : ''}`}>
      <div className="admin-comment-card__header">
        <div className="admin-comment-card__author">
          <img
            src={comment.author?.avatar_url || comment.author?.avatar || '/default-avatar.svg'}
            alt=""
            className="author-avatar"
          />
          <div className="author-info">
            <h4 className="author-name">
              {comment.author?.name} {comment.author?.user_surname}
            </h4>
            <p className="admin-comment-date">{formatDate(comment.created_at)}</p>
          </div>
        </div>
        <div className="admin-status-row" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          {comment.author_deleted && (
            <span className="admin-status-badge admin-status-badge--rejected">Автор удалён</span>
          )}
          {comment.is_hidden && (
            <span className="admin-status-badge admin-status-badge--pending">Скрыт</span>
          )}
          {comment.is_admin_reviewed && (
            <span className="admin-status-badge admin-status-badge--approved">Проверен</span>
          )}
          {reportsCount > 0 && (
            <span className="admin-status-badge admin-status-badge--rejected">
              Жалоб: {reportsCount}
            </span>
          )}
          {isDeleted && <span className="deleted-badge">Удалён</span>}
        </div>
      </div>

      <div className="admin-comment-card__content">
        <p className="admin-comment-text">{comment.comment_content}</p>
      </div>

      {(comment.post_id || comment.post?.id) && (
        <div className="admin-comment-card__post">
          <button
            type="button"
            className="admin-btn admin-btn-outline admin-btn-sm"
            onClick={() => onOpenPost?.(comment.post_id || comment.post?.id)}
          >
            Открыть публикацию
          </button>
        </div>
      )}

      {tab === 'reports' && Array.isArray(comment.reports) && comment.reports.length > 0 && (
        <div style={{ marginTop: '0.75rem', fontSize: '0.875rem' }}>
          <strong>Причины жалоб:</strong>{' '}
          {(comment.report_reasons || []).join(', ')}
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
            {comment.reports.map((r) => (
              <li key={r.id} style={{ marginBottom: '0.35rem' }}>
                {r.reason_label}
                {r.other_text ? ` — ${r.other_text}` : ''}
                {' · '}
                {r.reporter
                  ? `${r.reporter.name || ''} ${r.reporter.user_surname || ''} (${r.reporter.email})`.trim()
                  : '—'}
                {' · '}
                {formatDate(r.created_at)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isDeleted && (
        <div className="admin-comment-card__actions" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          {tab === 'recent' && !comment.is_admin_reviewed && (
            <button
              type="button"
              className="admin-btn admin-btn-success admin-btn-sm"
              onClick={() => onConfirm?.(comment.id)}
            >
              ✅ Подтвердить
            </button>
          )}
          {reportsCount > 0 && (
            <button
              type="button"
              className="admin-btn admin-btn-outline admin-btn-sm"
              onClick={() => onDismissReports?.(comment.id)}
            >
              Отклонить жалобы
            </button>
          )}
          {comment.is_hidden && (
            <button
              type="button"
              className="admin-btn admin-btn-primary admin-btn-sm"
              onClick={() => onUnhide?.(comment.id)}
            >
              Восстановить на сайте
            </button>
          )}
          <button
            type="button"
            className="admin-btn admin-btn-danger admin-btn-sm"
            onClick={() => onDelete?.(comment.id)}
          >
            🗑 Удалить
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-outline admin-btn-sm"
            onClick={() => setShowBanInput((v) => !v)}
          >
            Удалить + в словарь
          </button>
        </div>
      )}

      {showBanInput && !isDeleted && (
        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="admin-search-input"
            placeholder="Слова через запятую"
            value={banWords}
            onChange={(e) => setBanWords(e.target.value)}
            style={{ flex: '1', minWidth: '200px' }}
          />
          <button
            type="button"
            className="admin-btn admin-btn-danger admin-btn-sm"
            onClick={() => {
              const words = banWords.split(',').map((w) => w.trim()).filter(Boolean);
              onDeleteWithWords?.(comment.id, words);
              setShowBanInput(false);
              setBanWords('');
            }}
          >
            Удалить
          </button>
        </div>
      )}
    </div>
  );
}

export default CommentCard;
