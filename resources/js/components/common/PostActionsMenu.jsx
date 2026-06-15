import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import PostReportModal from '../modals/PostReportModal';

function PostActionsMenu({ postId, authorUserId, onReported, onLoginRequired }) {
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

  const isOwnPost = Boolean(
    user?.id != null
    && authorUserId != null
    && Number(authorUserId) === Number(user.id)
  );
  if (isOwnPost) return null;

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
          aria-label="Действия с публикацией"
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
      <PostReportModal
        open={reportOpen}
        postId={postId}
        onClose={() => setReportOpen(false)}
        onSuccess={(msg) => onReported?.(msg)}
      />
    </>
  );
}

export default PostActionsMenu;
