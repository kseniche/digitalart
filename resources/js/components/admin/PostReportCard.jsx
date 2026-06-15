import React from 'react';
import MediaPreview from '../common/MediaPreview';

const STATUS_LABELS = {
  pending: 'Ожидает',
  confirmed: 'Подтверждена',
  rejected: 'Отклонена',
};

function PostReportCard({ report, onConfirm, onReject, onBan, onViewPost }) {
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

  const isPending = report.status === 'pending';
  const post = report.post;
  const author = post?.author;
  const canBanAuthor = author && !author.is_admin && !author.is_banned;

  return (
    <div className="admin-post-report-card">
      <div className="admin-post-report-card__header">
        <div>
          <span className={`admin-status-badge admin-status-badge--${report.status === 'confirmed' ? 'approved' : report.status === 'rejected' ? 'rejected' : 'pending'}`}>
            {STATUS_LABELS[report.status] || report.status}
          </span>
          <p className="admin-post-report-card__date">Создана: {formatDate(report.created_at)}</p>
          {report.reviewed_at && (
            <p className="admin-post-report-card__date">
              Рассмотрена: {formatDate(report.reviewed_at)}
              {report.reviewer && ` · ${report.reviewer.name} ${report.reviewer.user_surname || ''}`.trim()}
            </p>
          )}
        </div>
      </div>

      <div className="admin-post-report-card__body">
        <div className="admin-post-report-card__section">
          <strong>Жалоба от:</strong>
          <p>
            {report.reporter
              ? `${report.reporter.name || ''} ${report.reporter.user_surname || ''}`.trim()
              : '—'}
            {report.reporter?.email && (
              <span className="admin-post-report-card__muted"> ({report.reporter.email})</span>
            )}
          </p>
        </div>

        <div className="admin-post-report-card__section">
          <strong>Причина:</strong>
          <p>{report.reason_label || report.reason}</p>
          {report.other_text && <p className="admin-post-report-card__muted">{report.other_text}</p>}
        </div>

        {post && (
          <div className="admin-post-report-card__post">
            <strong>Публикация:</strong>
            <div className="admin-post-report-card__post-row">
              {post.image_url && (
                <MediaPreview
                  src={post.image_url}
                  mediaType={post.media_type}
                  alt={post.post_title}
                  className="admin-post-report-thumbnail"
                  enableLightbox={post.media_type !== 'video'}
                />
              )}
              <div className="admin-post-report-card__post-info">
                <p className="admin-post-report-card__post-title">{post.post_title || 'Без названия'}</p>
                {author && (
                  <p className="admin-post-report-card__muted">
                    Автор: {`${author.name || ''} ${author.user_surname || ''}`.trim()}
                    {author.email ? ` (${author.email})` : ''}
                    {author.is_banned && (
                      <span className="admin-status-badge admin-status-badge--rejected" style={{ marginLeft: '0.5rem' }}>
                        Заблокирован
                      </span>
                    )}
                  </p>
                )}
                {post.deleted_at && (
                  <span className="admin-status-badge admin-status-badge--rejected">Удалена</span>
                )}
                {post.moderation_status && post.moderation_status !== 'approved' && (
                  <span className="admin-status-badge admin-status-badge--pending">{post.moderation_status}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="admin-post-report-card__actions">
        {post?.id && (
          <button
            type="button"
            className="admin-btn admin-btn-outline admin-btn-sm"
            onClick={() => onViewPost?.(post.id)}
          >
            Открыть публикацию
          </button>
        )}
        {isPending && (
          <>
            <button
              type="button"
              className="admin-btn admin-btn-success admin-btn-sm"
              onClick={() => onConfirm?.(report.id)}
            >
              Подтвердить жалобу
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-outline admin-btn-sm"
              onClick={() => onReject?.(report.id)}
            >
              Отклонить жалобу
            </button>
          </>
        )}
        {canBanAuthor && (
          <button
            type="button"
            className="admin-btn admin-btn-danger admin-btn-sm"
            onClick={() => onBan?.(author)}
          >
            Заблокировать пользователя
          </button>
        )}
      </div>
    </div>
  );
}

export default PostReportCard;
