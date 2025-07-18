import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string, mfaToken?: string) => Promise<{ success: boolean; requiresMFA?: boolean; error?: string }>;
  logout: () => Promise<void>;
  setupMFA: () => Promise<{ success: boolean; qrCode?: string; secret?: string; error?: string }>;
  enableMFA: (token: string) => Promise<{ success: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  refreshToken: () => Promise<boolean>;
  isAuthenticated: boolean;
  mfaRequired: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaRequired, setMfaRequired] = useState(false);

  useEffect(() => {
    // Check for existing session
    checkAuth();
    
    // Set up token refresh interval
    const refreshInterval = setInterval(() => {
      if (localStorage.getItem('authToken')) {
        refreshToken();
      }
    }, 14 * 60 * 1000); // Refresh every 14 minutes (before 15-minute expiry)

    return () => clearInterval(refreshInterval);
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setLoading(false);
        return;
      }

      // Add a timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch('/api/profiles/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
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
        // Clear invalid token
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('warehouseId');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Clear potentially invalid token
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('warehouseId');
    } finally {
      setLoading(false);
    }
  };

  const login = async (
    email: string, 
    password: string, 
    mfaToken?: string
  ): Promise<{ success: boolean; requiresMFA?: boolean; error?: string }> => {
    setLoading(true);
    try {
      // Use the server API for authentication
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password, 
          mfaToken,
          deviceFingerprint: generateDeviceFingerprint()
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.requiresMFA) {
          setMfaRequired(true);
          return { success: false, requiresMFA: true };
        }
        return { success: false, error: data.message || 'Invalid credentials' };
      }

      const { user, token, refreshToken: refToken, sessionId } = data;

      // Store tokens and user info
      localStorage.setItem('authToken', token);
      localStorage.setItem('refreshToken', refToken);
      localStorage.setItem('userId', user.id);
      localStorage.setItem('warehouseId', user.warehouseId);
      localStorage.setItem('sessionId', sessionId);
      
      // Create full user object with proper structure
      const fullUser = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        warehouseId: user.warehouseId,
        active: true,
      };
      
      setUser(fullUser);
      setMfaRequired(false);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage regardless of API call success
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('warehouseId');
      localStorage.removeItem('sessionId');
      setUser(null);
      setMfaRequired(false);
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const refToken = localStorage.getItem('refreshToken');
      if (!refToken) {
        return false;
      }

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: refToken }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('authToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        return true;
      } else {
        // Refresh failed, logout user
        await logout();
        return false;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
      return false;
    }
  };

  const setupMFA = async (): Promise<{ success: boolean; qrCode?: string; secret?: string; error?: string }> => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'totp' }),
      });

      const data = await response.json();
      
      if (response.ok) {
        return { 
          success: true, 
          qrCode: data.setup?.qrCode, 
          secret: data.setup?.secret 
        };
      } else {
        return { success: false, error: data.message || 'MFA setup failed' };
      }
    } catch (error) {
      return { success: false, error: 'MFA setup failed' };
    }
  };

  const enableMFA = async (token: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch('/api/auth/mfa/enable', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();
      
      if (response.ok) {
        return { success: true };
      } else {
        return { success: false, error: data.message || 'MFA enable failed' };
      }
    } catch (error) {
      return { success: false, error: 'MFA enable failed' };
    }
  };

  const changePassword = async (
    currentPassword: string, 
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();
      
      if (response.ok) {
        return { success: true };
      } else {
        return { success: false, error: data.message || 'Password change failed' };
      }
    } catch (error) {
      return { success: false, error: 'Password change failed' };
    }
  };

  const generateDeviceFingerprint = (): string => {
    // Simple device fingerprinting
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);
    }
    
    const fingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      canvas: canvas.toDataURL(),
    };
    
    return btoa(JSON.stringify(fingerprint));
  };

  const value = {
    user,
    loading,
    login,
    logout,
    setupMFA,
    enableMFA,
    changePassword,
    refreshToken,
    isAuthenticated: !!user,
    mfaRequired,
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
