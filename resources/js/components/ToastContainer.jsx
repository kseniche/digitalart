import React from 'react';
import { useToast } from '../contexts/ToastContext';
import '../../css/app.css';

/** Фирменный акцент — бордо #7B0000; фон и рамка в той же гамме без сторонних цветов. */
const typeStyles = {
  success: { bg: 'rgba(123, 0, 0, 0.08)', border: '#7B0000', color: '#7B0000', icon: '✓' },
  error: { bg: 'rgba(123, 0, 0, 0.08)', border: '#7B0000', color: '#7B0000', icon: '✕' },
  warning: { bg: 'rgba(123, 0, 0, 0.08)', border: '#7B0000', color: '#7B0000', icon: '!' },
  info: { bg: 'rgba(123, 0, 0, 0.08)', border: '#7B0000', color: '#7B0000', icon: 'i' },
};

function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="toast-container"
      style={{
        position: 'fixed',
        // Смещаем ниже фиксированного хедера, чтобы уведомления не перекрывали его.
        top: 'calc(72px + 1rem)',
        right: '1rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        maxWidth: 'min(400px, calc(100vw - 2rem))',
        pointerEvents: 'none',
      }}
      aria-live="polite"
    >
      {toasts.map((t) => {
        const style = typeStyles[t.type] || typeStyles.info;
        return (
          <div
            key={t.id}
            className="toast-item"
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              borderLeft: `4px solid ${style.border}`,
              backgroundColor: style.bg,
              color: style.color,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.875rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            <span
              style={{
                flexShrink: 0,
                width: '1.25rem',
                height: '1.25rem',
                borderRadius: '50%',
                backgroundColor: style.border,
                color: '#DEDDD8',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '0.75rem',
              }}
            >
              {style.icon}
            </span>
            <span style={{ flex: 1, wordBreak: 'break-word' }}>{t.message}</span>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              aria-label="Закрыть"
              style={{
                flexShrink: 0,
                background: 'none',
                border: 'none',
                color: style.color,
                cursor: 'pointer',
                padding: '0.25rem',
                fontSize: '1.1rem',
                lineHeight: 1,
                opacity: 0.8,
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default ToastContainer;
