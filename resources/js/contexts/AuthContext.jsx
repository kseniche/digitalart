import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { apiFetchLocal as apiFetch, ensureCsrfCookie, setAuthToken } from '../api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Функция для проверки роли администратора
  const checkIsAdmin = (userData) => {
    if (!userData) return false;
    
    // Проверяем разные форматы ролей
    const roles = userData.roles || [];
    
    // Проверяем, есть ли роль admin в любом формате
    const hasAdminRole = roles.some(role => {
      if (typeof role === 'string') {
        return role === 'admin';
      } else if (role && typeof role === 'object') {
        return role.name === 'admin' || role.role === 'admin';
      }
      return false;
    });
    
    return hasAdminRole;
  };

  const refreshUserFromServer = useCallback(async () => {
    try {
      const res = await apiFetch('/api/user', {
        headers: { 
          'Accept': 'application/json',
        } 
      });
      
      if (res.ok) {
        const data = await res.json();
        const updatedUser = data.user || data;
        setUser(updatedUser);
        return updatedUser;
      }
      if (res.status === 401) {
        setAuthToken(null);
        setUser(null);
      }
    } catch (error) {
      setAuthToken(null);
      setUser(null);
    }
    return null;
  }, []);

  const login = useCallback(async (credentials) => {
    try {
      await ensureCsrfCookie();
      const response = await apiFetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(credentials)
      });
  
      if (!response.ok) {
        let errorMessage = 'Ошибка входа';
        let errors = {};
        try {
          const errorData = await response.json();
          if (response.status === 401) {
            errorMessage = errorData.message || 'Неверный email или пароль';
          } else if (response.status === 422) {
            if (errorData.errors && typeof errorData.errors === 'object') {
              errors = errorData.errors;
              const firstError = Object.values(errorData.errors)[0];
              errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
            } else {
              errorMessage = errorData.message || 'Ошибка валидации данных';
            }
          } else {
            errorMessage = errorData.message || 'Произошла ошибка при входе';
          }
        } catch (e) {
          if (response.status === 401) {
            errorMessage = 'Неверный email или пароль';
          }
        }
        return { success: false, error: errorMessage, errors };
      }
  
      const payload = await response.json();
      setAuthToken(payload?.token || null);

      const refreshed = await refreshUserFromServer();
      if (!refreshed && payload?.user) {
        setUser(payload.user);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Ошибка соединения с сервером' };
    }
  }, [refreshUserFromServer]);

  const register = useCallback(async (userData) => {
    try {
      await ensureCsrfCookie();
      const response = await apiFetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        let errorMessage = 'Ошибка регистрации';
        let errors = {};
        try {
          const errorData = await response.json();
          if (errorData.errors && typeof errorData.errors === 'object') {
            errors = errorData.errors;
            const firstError = Object.values(errorData.errors)[0];
            errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
          } else {
            errorMessage = errorData.message || errorMessage;
          }
        } catch (e) {
          if (response.status === 422) {
            errorMessage = 'Ошибка валидации данных';
          } else if (response.status === 409) {
            errorMessage = 'Пользователь с таким email уже существует';
          }
        }
        return { success: false, error: errorMessage, errors };
      }

      const payload = await response.json();
      setAuthToken(payload?.token || null);
      const refreshed = await refreshUserFromServer();
      if (!refreshed && payload?.user) {
        setUser(payload.user);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || 'Ошибка регистрации', errors: {} };
    }
  }, [refreshUserFromServer]);

  const acceptCommentRules = useCallback(async () => {
    try {
      const response = await apiFetch('/api/user/accept-comment-rules', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        return { success: false, error: data.message || 'Не удалось сохранить согласие' };
      }

      await refreshUserFromServer();
      return { success: true };
    } catch {
      return { success: false, error: 'Ошибка соединения с сервером' };
    }
  }, [refreshUserFromServer]);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/logout', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
      });
    } catch (error) {
      // Ошибка при выходе
    } finally {
      setAuthToken(null);
      setUser(null);
    }
  }, []);

  // Восстанавливаем пользователя только из серверной сессии Sanctum cookie.
  useEffect(() => {
    refreshUserFromServer().finally(() => setIsLoading(false));
  }, [refreshUserFromServer]);

  const isAdmin = useMemo(() => checkIsAdmin(user), [user]);

  const value = useMemo(() => ({
    user,
    isLoading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin,
    refreshUserFromServer,
    acceptCommentRules,
  }), [user, isLoading, login, register, logout, isAdmin, refreshUserFromServer, acceptCommentRules]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};