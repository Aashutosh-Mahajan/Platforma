'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import api, { clearStoredAuth, getStoredTokens } from '@/utils/api';

interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone: string;
  avatar: string | null;
  role: string;
}

interface AuthContextType {
  user: User | null;
  tokens: { access: string; refresh: string } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

interface RegisterData {
  email: string;
  username: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;

    const savedUser = localStorage.getItem('platforma-user');
    if (!savedUser) return null;

    try {
      return JSON.parse(savedUser) as User;
    } catch {
      return null;
    }
  });

  const [tokens, setTokens] = useState<{ access: string; refresh: string } | null>(() => getStoredTokens());
  const isLoading = false;

  const resetAuthState = useCallback(() => {
    setUser(null);
    setTokens(null);
    clearStoredAuth();
  }, []);

  useEffect(() => {
    const validateSession = async () => {
      if (!tokens || !user) return;

      try {
        const profileRes = await api.get('/users/profile/');
        setUser(profileRes.data);
        localStorage.setItem('platforma-user', JSON.stringify(profileRes.data));
      } catch {
        resetAuthState();
      }
    };

    void validateSession();
  }, [resetAuthState, tokens, user]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await axios.post(`${API_URL}/auth/login/`, { email, password });
    const tokenData = { access: res.data.access, refresh: res.data.refresh };
    setTokens(tokenData);
    localStorage.setItem('platforma-tokens', JSON.stringify(tokenData));

    // Fetch user profile
    const profileRes = await axios.get(`${API_URL}/users/profile/`, {
      headers: { Authorization: `Bearer ${tokenData.access}` },
    });
    setUser(profileRes.data);
    localStorage.setItem('platforma-user', JSON.stringify(profileRes.data));
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const res = await axios.post(`${API_URL}/auth/register/`, data);
    const tokenData = res.data.tokens;
    setTokens(tokenData);
    setUser(res.data.user);
    localStorage.setItem('platforma-tokens', JSON.stringify(tokenData));
    localStorage.setItem('platforma-user', JSON.stringify(res.data.user));
  }, []);

  const logout = useCallback(async () => {
    if (tokens?.refresh) {
      await axios.post(`${API_URL}/auth/logout/`, { refresh: tokens.refresh }, {
        headers: { Authorization: `Bearer ${tokens.access}` },
      }).catch(() => {});
    }

    resetAuthState();
  }, [tokens, resetAuthState]);

  return (
    <AuthContext.Provider value={{
      user,
      tokens,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    // SSR fallback
    return {
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: true,
      login: async () => {},
      register: async () => {},
      logout: async () => {},
    };
  }
  return context;
}
