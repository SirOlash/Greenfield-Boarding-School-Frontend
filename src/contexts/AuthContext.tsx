import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'SUPER_ADMIN' | 'BRANCH_ADMIN' | 'PARENT';

interface User {
  token: string;
  role: UserRole;
  branchId?: number;
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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth on mount
    const storedToken = localStorage.getItem('greenfield_token');
    const storedUser = localStorage.getItem('greenfield_user');
    
    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser({ ...parsedUser, token: storedToken });
      } catch {
        localStorage.removeItem('greenfield_token');
        localStorage.removeItem('greenfield_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (userData: User) => {
    localStorage.setItem('greenfield_token', userData.token);
    localStorage.setItem('greenfield_user', JSON.stringify({
      role: userData.role,
      branchId: userData.branchId,
      firstName: userData.firstName,
      email: userData.email,
    }));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('greenfield_token');
    localStorage.removeItem('greenfield_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
