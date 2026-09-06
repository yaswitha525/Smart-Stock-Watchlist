import { useState, useEffect, useCallback } from 'react';
import { User } from '../types/api';
import { authApi } from '../api/auth.api';

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('auth_user');
      return savedUser && savedUser !== 'undefined' ? JSON.parse(savedUser) : null;
    } catch {
      localStorage.removeItem('auth_user');
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => {
    const savedToken = localStorage.getItem('auth_token');
    return savedToken && savedToken !== 'undefined' ? savedToken : null;
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Sync auth state with localStorage & backend check
  useEffect(() => {
    async function checkAuth() {
      if (token) {
        try {
          const res = await authApi.getMe();
          setUser(res.user);
          localStorage.setItem('auth_user', JSON.stringify(res.user));
        } catch {
          // Token invalid or expired
          logout();
        }
      }
      setLoading(false);
    }
    checkAuth();

    const handleUnauthorized = () => logout();
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [token]);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const res = await authApi.login(email, pass);
      const authToken = res.token || (res as any)?.data?.token;
      const authUser = res.user || (res as any)?.data?.user;

      if (!authToken) {
        throw new Error('Server did not return a valid authentication token');
      }

      setToken(authToken);
      setUser(authUser);
      localStorage.setItem('auth_token', authToken);
      localStorage.setItem('auth_user', JSON.stringify(authUser));
      return res;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, pass: string) => {
    setLoading(true);
    try {
      const res = await authApi.register(name, email, pass);
      const authToken = res.token || (res as any)?.data?.token;
      const authUser = res.user || (res as any)?.data?.user;

      if (!authToken) {
        throw new Error('Server did not return a valid authentication token');
      }

      setToken(authToken);
      setUser(authUser);
      localStorage.setItem('auth_token', authToken);
      localStorage.setItem('auth_user', JSON.stringify(authUser));
      return res;
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }, []);

  return {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    loading,
    login,
    register,
    logout,
  };
}
