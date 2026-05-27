import React, { useEffect, useState } from 'react';

function MediaPreview({
  src,
  mediaType = 'image',
  alt = 'media',
  fallbackSrc = '/images/digital-art-1.jpg',
  className,
  style,
  controls = true,
  preload = 'metadata',
  onImageError,
  onMediaLoad,
}) {
  const safeType = mediaType === 'video' ? 'video' : 'image';
  const initialSrc = src || fallbackSrc;
  const [displaySrc, setDisplaySrc] = useState(initialSrc);

  useEffect(() => {
    setDisplaySrc(src || fallbackSrc);
  }, [src, fallbackSrc]);

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

  if (safeType === 'video') {
    return (
      <video
        src={displaySrc}
        className={className}
        style={style}
        controls={controls}
        preload={preload}
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
