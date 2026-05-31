import React from 'react';

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

function AdminNavIcon({ id }) {
  const props = { width: 22, height: 22, viewBox: '0 0 24 24', 'aria-hidden': true };

  switch (id) {
    case 'dashboard':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="7" {...stroke} />
          <rect x="14" y="3" width="7" height="7" {...stroke} />
          <rect x="3" y="14" width="7" height="7" {...stroke} />
          <rect x="14" y="14" width="7" height="7" {...stroke} />
        </svg>
      );
    case 'users':
      return (
        <svg {...props}>
          <circle cx="12" cy="8" r="3.5" {...stroke} />
          <path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" {...stroke} />
        </svg>
      );
    case 'posts':
      return (
        <svg {...props}>
          <path d="M6 4h9l5 5v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" {...stroke} />
          <path d="M14 4v5h5" {...stroke} />
        </svg>
      );
    case 'comments':
      return (
        <svg {...props}>
          <path d="M5 6h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 3V7a1 1 0 0 1 1-1z" {...stroke} />
        </svg>
      );
    case 'categories':
      return (
        <svg {...props}>
          <path d="M4 7h7v7H4zM13 7h7v7h-7zM4 16h7v4H4zM13 16h7v4h-7z" {...stroke} />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8" {...stroke} />
        </svg>
      );
  }
}

export default AdminNavIcon;
