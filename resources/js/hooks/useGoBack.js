import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Возврат на предыдущую страницу в SPA: state.from → history → fallback.
 */
export function useGoBack(fallbackPath = '/') {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    const from = location.state?.from;
    if (typeof from === 'string' && from.length > 0) {
      navigate(from);
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

    navigate(fallbackPath);
  }, [navigate, location.state, fallbackPath]);
}
