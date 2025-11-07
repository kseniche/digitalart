import React, { createContext, useContext, useState, useEffect } from 'react';

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

  // Проверяем, есть ли сохраненные данные пользователя
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        refreshUserFromServer();
      } catch (error) {
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (credentials) => {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(credentials)
      });
  
      if (!response.ok) {
        let errorMessage = 'Ошибка входа';
        
        try {
          const errorData = await response.json();
          
          if (response.status === 401) {
            errorMessage = errorData.message || 'Неверный email или пароль';
          } else if (response.status === 422) {
            if (errorData.errors) {
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
        
        return { success: false, error: errorMessage };
      }
  
      const userData = await response.json();
      const user = userData.user;
      
      // Запрашиваем полные данные пользователя с ролями
      const token = userData.token;
      if (token) {
        try {
          const userResponse = await fetch('/api/user', {
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (userResponse.ok) {
            const fullUserData = await userResponse.json();
            
            // Используем пользователя с ролями
            const userWithRoles = fullUserData.user || fullUserData;
            setUser(userWithRoles);
            localStorage.setItem('user', JSON.stringify(userWithRoles));
            localStorage.setItem('token', token);
            return { success: true };
          }
        } catch (error) {
          // Продолжаем с базовыми данными пользователя
        }
      }
      
      // Fallback: используем данные без ролей
      setUser(user);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', userData.token);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Ошибка соединения с сервером' };
    }
  };

  const register = async (userData) => {
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        let errorMessage = 'Ошибка регистрации';
        try {
          const errorData = await response.json();
          if (errorData.errors) {
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
        throw new Error(errorMessage);
      }

      const result = await response.json();
      const user = result.user;
      
      setUser(user);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', result.token);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch('/api/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        });
      }
    } catch (error) {
      // Ошибка при выходе
    } finally {
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
  };

  const refreshUserFromServer = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !user) return;
      
      const res = await fetch('/api/user', { 
        headers: { 
          'Accept': 'application/json', 
          'Authorization': `Bearer ${token}` 
        } 
      });
      
      if (res.ok) {
        const data = await res.json();
        const updatedUser = data.user || data;
        
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      // Ошибка при обновлении данных пользователя
    }
  };

  const value = {
    user,
    isLoading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin: checkIsAdmin(user), // Вызываем функцию при каждом рендере
    refreshUserFromServer
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};