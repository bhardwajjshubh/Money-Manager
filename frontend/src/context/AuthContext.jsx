import { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import api, { setAccessToken } from '../utils/api';

const AuthContext = createContext();

const FALLBACK_API_BASE_URLS = [
  'https://money-manager-backend.onrender.com/api/v1',
  'https://money-manager.onrender.com/api/v1'
];

const isMalformedAuthPayload = (data) => {
  if (!data || typeof data !== 'object') return true;
  return !data?.data?.accessToken || !data?.data?.user;
};

const shouldTryFallback = () => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host !== 'localhost' && host !== '127.0.0.1';
};

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
    const primaryResponse = await api.post('/auth/login', { email, password });

    if (!isMalformedAuthPayload(primaryResponse.data)) {
      setAccessToken(primaryResponse.data.data.accessToken);
      setUser(primaryResponse.data.data.user);
      return primaryResponse.data;
    }

    if (!shouldTryFallback()) {
      throw new Error('Login response was invalid. Check API configuration.');
    }

    let lastError = new Error('Unable to reach backend API.');

    for (const baseURL of FALLBACK_API_BASE_URLS) {
      try {
        const response = await axios.post(
          `${baseURL}/auth/login`,
          { email, password },
          { withCredentials: true, timeout: 8000 }
        );

        if (isMalformedAuthPayload(response.data)) {
          continue;
        }

        api.defaults.baseURL = baseURL;
        setAccessToken(response.data.data.accessToken);
        setUser(response.data.data.user);
        return response.data;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError;
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
