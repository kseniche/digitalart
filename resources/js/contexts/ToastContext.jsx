import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { setApiErrorNotifier } from '../api';

const ToastContext = createContext(null);

const AUTO_CLOSE_MS = 4500;

/** Единые сообщения по типам ошибок API (критерий 2.7.5). data — тело ответа JSON при 4xx/5xx. */
function getApiErrorMessage(res, err, data) {
  if (err) return { type: 'error', message: 'Ошибка соединения с сервером' };
  const status = res?.status;
  const msg = data?.message;
  if (status === 401) return { type: 'error', message: 'Вы не авторизованы' };
  if (status === 403) {
    if (msg && String(msg).includes('заблокирован')) return { type: 'error', message: 'Ваш аккаунт заблокирован' };
    return { type: 'error', message: 'Недостаточно прав для выполнения действия' };
  }
  if (status === 404) return { type: 'warning', message: 'Запрашиваемый ресурс не найден' };
  if (status === 422) {
    return { type: 'error', message: msg || 'Проверьте правильность заполнения формы' };
  }
  if (status >= 500) {
    return { type: 'error', message: msg || 'Ошибка сервера. Попробуйте позже' };
  }
  if (msg) {
    return { type: 'error', message: String(msg) };
  }
  return { type: 'error', message: 'Ошибка сервера. Попробуйте позже' };
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const removeToast = useCallback((id) => {
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const lastToastRef = useRef({ message: '', type: '', at: 0 });

  const addToast = useCallback((type, message) => {
    const text = String(message ?? '').trim();
    if (!text) {
      return null;
    }
    const now = Date.now();
    const last = lastToastRef.current;
    if (last.message === text && last.type === type && now - last.at < 900) {
      return null;
    }
    lastToastRef.current = { message: text, type, at: now };

    const id = now + Math.random();
    const toast = { id, type, message: text };
    setToasts((prev) => [...prev, toast]);

    const timer = setTimeout(() => removeToast(id), AUTO_CLOSE_MS);
    timersRef.current[id] = timer;

    return id;
  }, [removeToast]);

  const toast = useCallback(
    (type) => (message) => addToast(type, message),
    [addToast]
  );

  useEffect(() => {
    setApiErrorNotifier((res, err, data) => {
      const { type, message } = getApiErrorMessage(res, err, data);
      addToast(type, message);
    });
    return () => setApiErrorNotifier(null);
  }, [addToast]);

  const toastApi = useMemo(() => ({
    success: toast('success'),
    error: toast('error'),
    warning: toast('warning'),
    info: toast('info'),
  }), [toast]);

  const value = useMemo(() => ({
    toasts,
    removeToast,
    toast: toastApi,
  }), [toasts, removeToast, toastApi]);

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}
