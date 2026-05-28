import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import CommentReportModal from '../modals/CommentReportModal';

function CommentActionsMenu({ commentId, authorUserId, isHidden, onReported, onLoginRequired }) {
  const { isAuthenticated, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  if (isHidden) return null;

  const isOwnComment = user && authorUserId != null && Number(authorUserId) === Number(user.id);
  if (isOwnComment) return null;

  const handleMenuClick = () => {
    if (!isAuthenticated) {
      onLoginRequired?.();
      return;
    }
    setOpen((v) => !v);
  };

  const handleReportClick = () => {
    if (!isAuthenticated) {
      onLoginRequired?.();
      return;
    }
    setOpen(false);
    setReportOpen(true);
  };

  return (
    <>
      <div ref={ref} className="post-comment-actions-menu">
        <button
          type="button"
          className="post-comment-actions-trigger"
          onClick={handleMenuClick}
          aria-label="Действия с комментарием"
          aria-expanded={open}
        >
          ⋮
        </button>
        {open && isAuthenticated && (
          <div className="post-comment-actions-dropdown" role="menu">
            <button
              type="button"
              className="post-comment-actions-item"
              role="menuitem"
              onClick={handleReportClick}
            >
              ⚠ Пожаловаться
            </button>
          </div>
        )}
      </div>
      <CommentReportModal
        open={reportOpen}
        commentId={commentId}
        onClose={() => setReportOpen(false)}
        onSuccess={(msg) => onReported?.(msg)}
      />
    </>
  );
}

export default CommentActionsMenu;
