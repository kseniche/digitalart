import React, { useEffect, useCallback, useState } from 'react';
import MediaPreview from './MediaPreview';

const MIN_SCALE = 0.5;
const MAX_SCALE = 4;
const SCALE_STEP = 0.25;

function MediaLightbox({ open, src, mediaType = 'image', alt = '', onClose }) {
  const [scale, setScale] = useState(1);
  const isImage = mediaType !== 'video';

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    setScale(1);
    document.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, handleKeyDown]);

  if (!open) {
    return null;
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const zoomIn = () => setScale((s) => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2)));
  const zoomOut = () => setScale((s) => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2)));
  const resetZoom = () => setScale(1);

  return (
    <div
      className="media-lightbox media-lightbox--open"
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр в полноэкранном режиме"
      onClick={handleBackdropClick}
    >
      <button
        type="button"
        className="media-lightbox__close"
        onClick={onClose}
        aria-label="Закрыть"
      >
        ×
      </button>

      {isImage && (
        <div className="media-lightbox__toolbar" role="toolbar" aria-label="Масштаб изображения">
          <button type="button" className="media-lightbox__tool-btn" onClick={zoomOut} aria-label="Уменьшить">
            −
          </button>
          <button type="button" className="media-lightbox__tool-btn" onClick={resetZoom} aria-label="Сбросить масштаб">
            {Math.round(scale * 100)}%
          </button>
          <button type="button" className="media-lightbox__tool-btn" onClick={zoomIn} aria-label="Увеличить">
            +
          </button>
        </div>
      )}

      <div
        className="media-lightbox__content"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="media-lightbox__viewport"
          style={isImage ? { transform: `scale(${scale})` } : undefined}
        >
          <MediaPreview
            src={src}
            mediaType={mediaType}
            alt={alt}
            className="media-lightbox__media"
            controls
            preload={mediaType === 'video' ? 'auto' : 'metadata'}
          />
        </div>
      </div>
    </div>
  );
}

export default MediaLightbox;
