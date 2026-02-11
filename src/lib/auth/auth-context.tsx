'use client';

import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import type { AdminUser, AdminRole } from '@/lib/types';
import { api, clearTokens } from '@/lib/api';

interface AuthContextType {
  admin: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: AdminRole[]) => boolean;
  hasLocationAccess: (locationId: string) => boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load admin from localStorage on mount
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('ruby_admin') : null;
    const token = typeof window !== 'undefined' ? localStorage.getItem('ruby_access_token') : null;

    if (stored && token) {
      try {
        const parsed = JSON.parse(stored);
        // Normalize: ensure _id exists (login response uses 'id')
        if (!parsed._id && parsed.id) {
          parsed._id = parsed.id;
        }
        setAdmin(parsed);
      } catch {
        clearTokens();
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.auth.login({ email, password });
    const { accessToken, refreshToken } = res.data;
    // Backend returns 'user' key, handle both 'admin' and 'user'
    const adminUser = res.data.admin || res.data.user;

    // Normalize: ensure _id exists
    if (!adminUser._id && adminUser.id) {
      adminUser._id = adminUser.id;
    }

    localStorage.setItem('ruby_access_token', accessToken);
    localStorage.setItem('ruby_refresh_token', refreshToken);
    localStorage.setItem('ruby_admin', JSON.stringify(adminUser));

    setAdmin(adminUser);
  }, []);

  const logout = useCallback(() => {
    api.auth.logout().catch(() => {});
    clearTokens();
    setAdmin(null);
    window.location.href = '/ruby-app/admin/login';
  }, []);

  const hasRole = useCallback(
    (...roles: AdminRole[]) => {
      if (!admin) return false;
      return admin.roles?.some((r) => roles.includes(r)) ?? false;
    },
    [admin]
  );

  const hasLocationAccess = useCallback(
    (locationId: string) => {
      if (!admin) return false;
      if (admin.scope === 'GLOBAL') return true;
      return admin.locationIds?.some(loc => {
        const id = typeof loc === 'object' && loc !== null ? loc._id : loc;
        return id === locationId;
      }) ?? false;
    },
    [admin]
  );

  // Super admin = has 'super_admin' role OR has GLOBAL scope (backend treats GLOBAL scope as full access)
  const isSuperAdmin =
    (admin?.roles?.includes('super_admin') || admin?.scope === 'GLOBAL') ?? false;

  return (
    <AuthContext.Provider
      value={{
        admin,
        isLoading,
        isAuthenticated: !!admin,
        login,
        logout,
        hasRole,
        hasLocationAccess,
        isSuperAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
