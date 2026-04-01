import { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import api, { setAccessToken } from '../utils/api';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  reload
} from 'firebase/auth';
import { firebaseAuth } from '../utils/firebase';

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

  const completeFirebaseSession = async (idToken, name) => {
    const payload = { idToken, name };
    const primaryResponse = await api.post('/auth/firebase-auth', payload);

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
          `${baseURL}/auth/firebase-auth`,
          payload,
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

  const login = async (email, password) => {
    const credentials = await signInWithEmailAndPassword(firebaseAuth, email, password);
    await reload(credentials.user);

    if (!credentials.user.emailVerified) {
      await sendEmailVerification(credentials.user);
      await signOut(firebaseAuth);
      throw new Error('Email is not verified. A new verification email has been sent.');
    }

    const idToken = await credentials.user.getIdToken(true);
    return completeFirebaseSession(idToken, credentials.user.displayName || email.split('@')[0]);
  };

  const signup = async (name, email, password) => {
    const credentials = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    if (name) {
      await updateProfile(credentials.user, { displayName: name });
    }

    await sendEmailVerification(credentials.user);
    await signOut(firebaseAuth);

    return {
      success: true,
      message: 'Verification email sent. Please verify your email and then log in.'
    };
  };

  const requestPasswordReset = async (email) => {
    await sendPasswordResetEmail(firebaseAuth, email);
    return {
      success: true,
      message: 'Password reset email sent. Check your inbox.'
    };
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }

    try {
      await signOut(firebaseAuth);
    } catch (error) {
      console.error('Firebase logout error:', error);
    }

    setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, signup, requestPasswordReset, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
