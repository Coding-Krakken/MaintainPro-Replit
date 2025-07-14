import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/profiles/me', {
        headers: {
          'x-user-id': localStorage.getItem('userId') || 'default-supervisor-id',
          'x-warehouse-id': localStorage.getItem('warehouseId') || 'default-warehouse-id',
        },
      });

      if (response.ok) {
        const profile = await response.json();
        setUser({
          id: profile.id,
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          role: profile.role,
          warehouseId: profile.warehouseId,
          active: profile.active,
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      // In a real implementation, this would authenticate with Supabase
      // For demo purposes, we'll simulate login
      const mockUser: AuthUser = {
        id: 'supervisor-id',
        email,
        firstName: 'John',
        lastName: 'Smith',
        role: 'supervisor',
        warehouseId: 'warehouse-1',
        active: true,
      };
      
      localStorage.setItem('userId', mockUser.id);
      localStorage.setItem('warehouseId', mockUser.warehouseId);
      setUser(mockUser);
    } catch (error) {
      throw new Error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('warehouseId');
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
