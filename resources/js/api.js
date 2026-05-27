/**
 * API-клиент с поддержкой CSRF для SPA (Laravel Sanctum).
 * Критерии 2.2.8: все мутирующие запросы отправляются с credentials и X-XSRF-TOKEN.
 * Критерий 2.7.5: единая обработка сбоев (сеть/сервер) через глобальный notifier.
 */

const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const AUTH_TOKEN_KEY = 'auth_token';

/** @type {((res: Response | null, err?: Error) => void) | null} */
let apiErrorNotifier = null;

/**
 * Регистрирует глобальный обработчик ошибок API (вызывается из ToastProvider).
 * @param {((res: Response | null, err?: Error) => void) | null} fn
 */
export function setApiErrorNotifier(fn) {
  apiErrorNotifier = fn;
}

/**
 * Читает значение CSRF-токена из cookie (Laravel записывает его при GET /sanctum/csrf-cookie).
 * @returns {string|null}
 */
export function getXsrfToken() {
  const match = document.cookie.match(new RegExp('(^|;\\s*)' + CSRF_COOKIE_NAME + '=([^;]*)'));
  return match ? decodeURIComponent(match[2].trim()) : null;
}

/**
 * Вызывает GET /sanctum/csrf-cookie для установки cookie. Вызывать при старте приложения
 * или перед первым мутирующим запросом. withCredentials обязателен.
 */
export function ensureCsrfCookie() {
  const url = typeof window !== 'undefined' && window.location?.origin
    ? `${window.location.origin}/sanctum/csrf-cookie`
    : '/sanctum/csrf-cookie';
  return fetch(url, { method: 'GET', credentials: 'include' });
}

/**
 * Возвращает сохранённый API-токен Sanctum (Bearer).
 * Срок действия задаётся на сервере (config/sanctum.php, по умолчанию 7 суток).
 * @returns {string|null}
 */
export function getAuthToken() {
  if (typeof window === 'undefined') return null;
  const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
  return token && token.trim() ? token : null;
}

/**
 * Сохраняет/очищает API-токен в localStorage.
 * @param {string|null} token
 */
export function setAuthToken(token) {
  if (typeof window === 'undefined') return;
  if (token && token.trim()) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token.trim());
    return;
  }
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

/**
 * Обёртка над fetch для запросов к API с учётом CSRF и cookies.
 * При ответе с ошибкой (4xx/5xx) или при сетевой ошибке вызывает apiErrorNotifier
 * для единообразного уведомления (toast). Ответ возвращается без изменений.
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<Response>}
 */
export function apiFetch(url, options = {}) {
  const opts = { ...options };
  opts.credentials = 'include';
  opts.headers = new Headers(opts.headers || {});

  // Защита от "Authorization: Bearer null/undefined" из старых вызовов.
  const authHeader = opts.headers.get('Authorization');
  if (authHeader) {
    const normalized = authHeader.trim().toLowerCase();
    if (
      normalized === 'bearer null' ||
      normalized === 'bearer undefined' ||
      normalized === 'bearer'
    ) {
      opts.headers.delete('Authorization');
    }
  }

  // Fallback: если cookie-сессия недоступна, используем bearer-токен.
  if (!opts.headers.get('Authorization')) {
    const token = getAuthToken();
    if (token) {
      opts.headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const method = (opts.method || 'GET').toUpperCase();
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  const isSameOrigin = typeof url === 'string' && (url.startsWith('/') || url.includes((typeof window !== 'undefined' && window.location?.host) || ''));

  if (isSameOrigin && isMutating) {
    const token = getXsrfToken();
    if (token) {
      opts.headers.set('X-XSRF-TOKEN', token);
    }
  }

  return fetch(url, opts)
    .then((res) => {
      if (!res.ok && apiErrorNotifier) {
        const notifier = apiErrorNotifier;
        res.clone().json().then((data) => {
          notifier(res, null, data);
        }).catch(() => {
          notifier(res, null, null);
        });
      }
      return res;
    })
    .catch((err) => {
      if (apiErrorNotifier) {
        apiErrorNotifier(null, err);
      }
      throw err;
    });
}
