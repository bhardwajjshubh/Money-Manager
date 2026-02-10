import { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import api, { setAccessToken } from '../utils/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const isCheckingAuth = useRef(false);

  const checkAuth = useCallback(async () => {
    // Prevent multiple simultaneous auth checks
    if (isCheckingAuth.current) return;

    const currentPath = window.location.pathname;
    const publicPaths = ['/login', '/signup', '/forgot-password'];
    const isPublicRoute = publicPaths.includes(currentPath);

    if (isPublicRoute) {
      setLoading(false);
      return;
    }

    isCheckingAuth.current = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const { data } = await api.post('/auth/refresh', {}, { signal: controller.signal });
      setAccessToken(data.data.accessToken);
      const userRes = await api.get('/users/me', { signal: controller.signal });
      setUser(userRes.data.data.user);
    } catch (error) {
      // Don't log errors on auth pages to prevent console spam
      if (!isPublicRoute && error?.name !== 'CanceledError') {
        console.error('Auth check failed:', error.message);
      }
      setUser(null);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
      isCheckingAuth.current = false;
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAccessToken(data.data.accessToken);
    setUser(data.data.user);
    return data;
  };

  const signup = async (name, email, password) => {
    const { data } = await api.post('/auth/signup', { name, email, password });
    setAccessToken(data.data.accessToken);
    setUser(data.data.user);
    return data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
    setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
