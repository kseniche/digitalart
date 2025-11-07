import React from 'react';

function DeleteProfileModal({ onClose, onConfirm, isDeleting }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        
        <h2 style={{ 
          marginBottom: '1rem', 
          color: '#111827', 
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '1.5rem',
          fontWeight: 'bold'
        }}>
          Удаление профиля
        </h2>
        
        <p style={{
          color: '#6b7280',
          marginBottom: '1.5rem',
          lineHeight: '1.6',
          fontFamily: 'JetBrains Mono, monospace'
        }}>
          Вы уверены, что хотите удалить свой профиль? Это действие <strong style={{ color: '#7B0000' }}>невозможно отменить</strong>.
        </p>
        
        <p style={{
          color: '#7B0000',
          marginBottom: '1rem',
          fontSize: '0.9rem',
          fontFamily: 'JetBrains Mono, monospace',
          fontWeight: 'bold'
        }}>
          Внимание: Все ваши данные будут удалены безвозвратно:
        </p>
        
        <ul style={{
          color: '#6b7280',
          marginBottom: '1.5rem',
          paddingLeft: '1.5rem',
          lineHeight: '1.8',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '0.9rem'
        }}>
          <li>Ваши публикации</li>
          <li>Комментарии</li>
          <li>Лайки</li>
          <li>Подписки</li>
          <li>Все загруженные изображения</li>
        </ul>
        
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'flex-end'
        }}>
          <button
            className="btn btn-secondary"
            disabled={isDeleting}
            onClick={onClose}
            style={{
              padding: '0.5rem 1.5rem',
              fontFamily: 'JetBrains Mono, monospace'
            }}
          >
            Отмена
          </button>
          <button
            className="btn"
            disabled={isDeleting}
            onClick={onConfirm}
            style={{
              background: '#7B0000',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1.5rem',
              borderRadius: '8px',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              opacity: isDeleting ? 0.6 : 1,
              fontFamily: 'JetBrains Mono, monospace'
            }}
          >
            {isDeleting ? 'Удаление...' : 'Да, удалить профиль'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteProfileModal;

