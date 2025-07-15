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
      // Add a timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch('/api/profiles/me', {
        headers: {
          'x-user-id': localStorage.getItem('userId') || 'default-supervisor-id',
          'x-warehouse-id': localStorage.getItem('warehouseId') || 'default-warehouse-id',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

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
      } else {
        console.warn('Auth check failed with status:', response.status);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // For now, set a default user for demo purposes
      if (localStorage.getItem('userId')) {
        setUser({
          id: localStorage.getItem('userId') || 'demo-user',
          email: 'demo@example.com',
          firstName: 'Demo',
          lastName: 'User',
          role: 'supervisor',
          warehouseId: localStorage.getItem('warehouseId') || 'demo-warehouse',
          active: true,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      // Demo credentials validation
      const validCredentials = [
        { email: 'supervisor@maintainpro.com', password: 'demo123', role: 'supervisor' },
        { email: 'technician@maintainpro.com', password: 'demo123', role: 'technician' },
        { email: 'manager@maintainpro.com', password: 'demo123', role: 'manager' },
      ];
      
      const validUser = validCredentials.find(cred => cred.email === email && cred.password === password);
      
      if (!validUser) {
        throw new Error('Invalid credentials');
      }
      
      // For demo purposes, we'll simulate login
      const mockUser: AuthUser = {
        id: `${validUser.role}-id`,
        email,
        firstName: 'John',
        lastName: 'Smith',
        role: validUser.role as any,
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
