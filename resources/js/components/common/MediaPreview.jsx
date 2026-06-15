import React, { useCallback, useEffect, useRef, useState } from 'react';
import MediaLightbox from './MediaLightbox';

const DESKTOP_HOVER_MQ = '(min-width: 770px)';

function MediaPreview({
  src,
  mediaType = 'image',
  alt = 'media',
  fallbackSrc = '/images/digital-art-1.jpg',
  className,
  style,
  controls = true,
  preload = 'metadata',
  playsInline = true,
  onImageError,
  onMediaLoad,
  /** Открыть изображение в полноэкранном lightbox по клику (только image) */
  enableLightbox = false,
  /** 'card' — лента/профиль: без controls на desktop + hover autoplay; на mobile — native controls */
  interactionMode = 'default',
}) {
  const safeType = mediaType === 'video' ? 'video' : 'image';
  const initialSrc = src || fallbackSrc;
  const [displaySrc, setDisplaySrc] = useState(initialSrc);
  const videoRef = useRef(null);
  const [hoverAutoplayEnabled, setHoverAutoplayEnabled] = useState(false);

  const isCardVideo = safeType === 'video' && interactionMode === 'card';
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    setDisplaySrc(src || fallbackSrc);
  }, [src, fallbackSrc]);

  useEffect(() => {
    if (!isCardVideo) {
      return undefined;
    }
    const mq = window.matchMedia(DESKTOP_HOVER_MQ);
    const sync = () => setHoverAutoplayEnabled(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [isCardVideo]);

  const notifyLayout = () => {
    if (typeof onMediaLoad === 'function') {
      onMediaLoad();
    }
  };

  const applyFallback = (e) => {
    if (displaySrc !== fallbackSrc) {
      setDisplaySrc(fallbackSrc);
    }
    if (typeof onImageError === 'function') {
      onImageError(e);
    }
  };

  const handleMouseEnter = useCallback(() => {
    if (!isCardVideo || !hoverAutoplayEnabled) {
      return;
    }
    const el = videoRef.current;
    if (!el) {
      return;
    }
    el.muted = true;
    const playPromise = el.play();
    if (playPromise?.catch) {
      playPromise.catch(() => {});
    }
  }, [isCardVideo, hoverAutoplayEnabled]);

  const handleMouseLeave = useCallback(() => {
    if (!isCardVideo || !hoverAutoplayEnabled) {
      return;
    }
    const el = videoRef.current;
    if (!el) {
      return;
    }
    el.pause();
    try {
      el.currentTime = 0;
    } catch {
      /* ignore */
    }
  }, [isCardVideo, hoverAutoplayEnabled]);

  const openLightbox = useCallback(() => {
    if (enableLightbox && safeType === 'image') {
      setLightboxOpen(true);
    }
  }, [enableLightbox, safeType]);

  const handleImageKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLightbox();
      }
    },
    [openLightbox]
  );

  if (safeType === 'video') {
    const showControls = isCardVideo ? !hoverAutoplayEnabled : controls;
    const videoClassName = [
      className,
      isCardVideo ? 'media-preview--feed-card' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <video
        ref={videoRef}
        src={displaySrc}
        className={videoClassName}
        style={style}
        controls={showControls}
        muted={isCardVideo || undefined}
        loop={isCardVideo && hoverAutoplayEnabled ? true : undefined}
        preload={preload}
        playsInline={playsInline}
        disablePictureInPicture={isCardVideo && hoverAutoplayEnabled ? true : undefined}
        controlsList={isCardVideo && hoverAutoplayEnabled ? 'nodownload noplaybackrate' : undefined}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onLoadedData={notifyLayout}
        onError={applyFallback}
      />
    );
  }

  const imageClassName = [className, enableLightbox ? 'media-preview--lightbox-trigger' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <img
        src={displaySrc}
        alt={alt}
        className={imageClassName}
        style={style}
        loading="lazy"
        onLoad={notifyLayout}
        onError={applyFallback}
        onClick={enableLightbox ? openLightbox : undefined}
        onKeyDown={enableLightbox ? handleImageKeyDown : undefined}
        role={enableLightbox ? 'button' : undefined}
        tabIndex={enableLightbox ? 0 : undefined}
      />
      {enableLightbox && (
        <MediaLightbox
          open={lightboxOpen}
          src={displaySrc}
          mediaType="image"
          alt={alt}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}

export default MediaPreview;
