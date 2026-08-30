import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('trustguard_token'));
  const [isLoading, setIsLoading] = useState(true);

  // Restore authenticated session on initial load
  useEffect(() => {
    async function restoreSession() {
      const storedToken = localStorage.getItem('trustguard_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await authApi.getMe();
        setUser(data.user);
      } catch (err) {
        console.warn('[Auth] Token invalid or expired, clearing session:', err.message);
        localStorage.removeItem('trustguard_token');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  const login = async (email, password) => {
    const data = await authApi.login({ email, password });
    if (data.token && data.user) {
      localStorage.setItem('trustguard_token', data.token);
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  };

  const register = async (userData) => {
    const data = await authApi.register(userData);
    if (data.token && data.user) {
      localStorage.setItem('trustguard_token', data.token);
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  };

  const loginWithGoogle = async (credentialData) => {
    const data = await authApi.googleLogin(credentialData);
    if (data.token && data.user) {
      localStorage.setItem('trustguard_token', data.token);
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  };

  const logout = () => {
    localStorage.removeItem('trustguard_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
