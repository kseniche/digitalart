import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function parseReturnPath(from) {
  try {
    const url = new URL(from, window.location.origin);
    return {
      pathname: url.pathname || '/',
      search: url.search || '',
      hash: url.hash || '',
    };
  } catch {
    return { pathname: '/', search: '', hash: '' };
  }
}

/**
 * Возврат на предыдущую страницу в SPA: state.from → history → fallback.
 */
export function useGoBack(fallbackPath = '/') {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    const from = location.state?.from;
    if (typeof from === 'string' && from.length > 0) {
      const target = parseReturnPath(from);
      navigate(target);
      return;
    }

    const idx = window.history.state?.idx;
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1);
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(parseReturnPath(fallbackPath));
  }, [navigate, location.state, fallbackPath]);
}
