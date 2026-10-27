import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { UserRole } from '@/types/payment-api';
export type { UserRole } from '@/types/payment-api';

interface User {
  token: string;
  role: UserRole;
  branchId?: number | null;
  firstName: string;
  email?: string;
}
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: User) => void;
  logout: () => void;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

function isSavedUser(value: unknown): value is Omit<User, 'token'> {
  if (typeof value !== 'object' || value == null) return false;
  return 'role' in value && typeof value.role === 'string' && ['SUPER_ADMIN', 'BRANCH_ADMIN', 'PARENT'].includes(String(value.role)) &&
    'firstName' in value && typeof value.firstName === 'string' &&
    (!('email' in value) || typeof value.email === 'string') &&
    (!('branchId' in value) || value.branchId == null ||
      (typeof value.branchId === 'number' && Number.isSafeInteger(value.branchId) && value.branchId > 0));
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const clearSession = () => {
      localStorage.removeItem('greenfield_token');
      localStorage.removeItem('greenfield_user');
      setUser(null);
    };
    const storedToken = localStorage.getItem('greenfield_token');
    const storedUser = localStorage.getItem('greenfield_user');
    if (storedToken && storedUser) {
      try {
        const parsedUser: unknown = JSON.parse(storedUser);
        if (isSavedUser(parsedUser)) setUser({ ...parsedUser, token: storedToken });
        else clearSession();
      } catch {
        clearSession();
      }
    } else {
      clearSession();
    }
    setIsLoading(false);
    window.addEventListener('greenfield:unauthorized', clearSession);
    return () => window.removeEventListener('greenfield:unauthorized', clearSession);
  }, []);
  const login = (userData: User) => {
    localStorage.setItem('greenfield_token', userData.token);
    localStorage.setItem('greenfield_user', JSON.stringify({
      role: userData.role, branchId: userData.branchId,
      firstName: userData.firstName, email: userData.email,
    }));
    setUser(userData);
  };
  const logout = () => {
    localStorage.removeItem('greenfield_token');
    localStorage.removeItem('greenfield_user');
    setUser(null);
  };
  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
