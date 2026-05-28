import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useGoBack } from '../../hooks/useGoBack';
import { CommunityRulesBody } from '../../content/communityRulesContent';
import '../../../css/app.css';

function CommunityRulesPage() {
  const goBack = useGoBack('/');
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.replace('#', '');
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash]);

  return (
    <div className="main-content" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <button type="button" onClick={goBack} className="ui-page-back" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
          ← Назад
        </button>
      </div>
      <h1 className="ui-section-title" style={{ marginBottom: '1rem' }}>
        Правила сообщества
      </h1>
      <div className="ui-panel" style={{ padding: '1.5rem' }}>
        <CommunityRulesBody />
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '1rem' }}>
          Также см.{' '}
          <Link to="/user-agreement" style={{ color: '#7B0000' }}>
            Пользовательское соглашение
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

export default CommunityRulesPage;
