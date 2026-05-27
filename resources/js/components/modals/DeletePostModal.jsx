import React from 'react';

function DeletePostModal({ onClose, onConfirm, isDeleting }) {
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
          Удаление публикации
        </h2>
        
        <p style={{
          color: '#6b7280',
          marginBottom: '1.5rem',
          lineHeight: '1.6',
          fontFamily: 'JetBrains Mono, monospace'
        }}>
          Вы уверены, что хотите удалить эту публикацию? Это действие <strong style={{ color: '#7B0000' }}>невозможно отменить</strong>.
        </p>
        
        <p style={{
          color: '#7B0000',
          marginBottom: '1rem',
          fontSize: '0.9rem',
          fontFamily: 'JetBrains Mono, monospace',
          fontWeight: 'bold'
        }}>
          Внимание: Все данные будут удалены безвозвратно:
        </p>
        
        <ul style={{
          color: '#6b7280',
          marginBottom: '1.5rem',
          paddingLeft: '1.5rem',
          lineHeight: '1.8',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '0.9rem'
        }}>
          <li>Публикация</li>
          <li>Все комментарии</li>
          <li>Все лайки</li>
          <li>Загруженное изображение</li>
        </ul>
        
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'flex-end'
        }}>
          <button
            className="btn btn-outline"
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
            className="btn btn-danger"
            disabled={isDeleting}
            onClick={onConfirm}
            style={{
              padding: '0.5rem 1.5rem',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              opacity: isDeleting ? 0.6 : 1,
              fontFamily: 'JetBrains Mono, monospace'
            }}
          >
            {isDeleting ? 'Удаление...' : 'Да, удалить'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeletePostModal;

