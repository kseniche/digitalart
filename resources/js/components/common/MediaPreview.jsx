import React, { useCallback, useEffect, useRef, useState } from 'react';

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
  /** 'card' — лента/профиль: без controls на desktop + hover autoplay; на mobile — native controls */
  interactionMode = 'default',
}) {
  const safeType = mediaType === 'video' ? 'video' : 'image';
  const initialSrc = src || fallbackSrc;
  const [displaySrc, setDisplaySrc] = useState(initialSrc);
  const videoRef = useRef(null);
  const [hoverAutoplayEnabled, setHoverAutoplayEnabled] = useState(false);

  const isCardVideo = safeType === 'video' && interactionMode === 'card';

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

  return (
    <img
      src={displaySrc}
      alt={alt}
      className={className}
      style={style}
      loading="lazy"
      onLoad={notifyLayout}
      onError={applyFallback}
    />
  );
}

export default MediaPreview;
