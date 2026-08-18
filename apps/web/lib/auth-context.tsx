'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';

export interface AuthUser {
  id: string;
  tenantId: string;
  tenantName: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const res = await api.get('/profile');
          const p = res.data;
          setUser({
            id: p.id,
            tenantId: p.tenantId,
            tenantName: p.tenant?.name || 'Organization',
            email: p.email,
            firstName: p.firstName,
            lastName: p.lastName,
            role: p.role?.name || 'User',
            avatar: p.avatar,
          });
        } catch (err) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setUser(null);
        }
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { accessToken, refreshToken } = res.data.tokens;
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    setUser(res.data.user);
    router.push('/dashboard');
  };

  const register = async (data: any) => {
    const res = await api.post('/auth/register', data);
    const { accessToken, refreshToken } = res.data.tokens;
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    setUser(res.data.user);
    router.push('/dashboard');
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken });
      } catch (e) {
        // Ignore logout errors
      }
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
