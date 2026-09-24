import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import { authAPI, type RegisterData, type LoginData, type RegisterResult } from '../api/auth';
import { getAccessToken, clearTokens } from '../api/client';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<RegisterResult>;
  /** Finish sign-in with a verification code (tokens are stored by the API call). */
  verifyEmailCode: (email: string, code: string) => Promise<void>;
  /** Signs out and hard-reloads to `redirectTo` (default home). */
  logout: (redirectTo?: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already logged in on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const token = getAccessToken();
      if (token) {
        try {
          const profile = await authAPI.getProfile();
          setUser(profile);
        } catch (err) {
          console.error('Failed to load user profile:', err);
          clearTokens();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (data: LoginData) => {
    setError(null);
    try {
      await authAPI.login(data);
      const profile = await authAPI.getProfile();
      setUser(profile);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Login failed';
      setError(errorMessage);
      throw err;
    }
  };

  // Registration and code verification don't toggle the global `loading`
  // flag: the auth pages show their own pending state, and flipping it would
  // blank protected routes mid-flow.
  const register = async (data: RegisterData) => {
    setError(null);
    return authAPI.register(data);
  };

  const verifyEmailCode = async (email: string, code: string) => {
    setError(null);
    await authAPI.verifyCode(email, code);
    const profile = await authAPI.getProfile();
    setUser(profile);
  };

  const logout = async (redirectTo = '/') => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
    // A full reload, not setUser(null): clearing the user while a protected
    // page is still mounted makes ProtectedRoute remember that page as the
    // "return to" target, so the next person to sign in (say, a customer
    // after an admin) was sent to the previous user's dashboard. Reloading
    // also drops every per-user cache (cart, notifications, bookings).
    window.location.replace(redirectTo);
  };

  const updateProfile = async (data: Partial<User>) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await authAPI.updateProfile(data);
      setUser(updated);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Profile update failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    loading,
    error,
    login,
    register,
    verifyEmailCode,
    logout,
    updateProfile,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
