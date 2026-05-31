import React from 'react';

const iconProps = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export function IconHeart({ active = false }) {
  if (active) {
    return (
      <svg {...iconProps} fill="currentColor" stroke="currentColor">
        <path d="M12 21s-6.7-4.35-9.33-8.1C.5 9.5 2.2 5.5 6 5.5c2 0 3.2 1.2 4 2.4C11.8 6.7 13 5.5 15 5.5c3.8 0 5.5 4 3.33 7.4C18.7 16.65 12 21 12 21z" />
      </svg>
    );
  }
  return (
    <svg {...iconProps}>
      <path d="M12 21s-6.7-4.35-9.33-8.1C.5 9.5 2.2 5.5 6 5.5c2 0 3.2 1.2 4 2.4C11.8 6.7 13 5.5 15 5.5c3.8 0 5.5 4 3.33 7.4C18.7 16.65 12 21 12 21z" />
    </svg>
  );
}

export function IconBookmark({ active = false }) {
  return (
    <svg {...iconProps} fill={active ? 'currentColor' : 'none'}>
      <path d="M6 4h12v16l-6-4-6 4V4z" />
    </svg>
  );
}

export function IconComment() {
  return (
    <svg {...iconProps}>
      <path d="M5 6h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 3V7a1 1 0 0 1 1-1z" />
    </svg>
  );
}

export function IconEdit() {
  return (
    <svg {...iconProps}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export function IconTrash() {
  return (
    <svg {...iconProps}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export function IconPublish() {
  return (
    <svg {...iconProps}>
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  );
}
