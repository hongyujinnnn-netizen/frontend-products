import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import type { User } from '../types/user';
import { signIn as apiSignIn, signUp as apiSignUp } from '../services/auth';
import { getErrorMessage } from '../services/apiError';
import { getAuthToken, storeAuthToken, clearAuthToken } from '../utils/auth';

/**
 * Authentication Context
 * Manages global authentication state including login, logout, and token management
 */

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (username: string, email: string, password: string) => Promise<void>;
  signOut: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_KEY = 'auth_user';

interface TokenPayload {
  userId: number;
  email: string;
  role: string;
  exp: number;
}

/**
 * Decode JWT token without verification (client-side only)
 */
function decodeToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const decoded = JSON.parse(atob(parts[1]));
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired
 */
function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload) return true;
  
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
}

/**
 * Extract role from JWT token
 */
function getRoleFromToken(token: string): 'USER' | 'ADMIN' | null {
  try {
    const payload = decodeToken(token);
    if (!payload) return null;
    
    const payloadObj = payload as Record<string, any>;
    const role = (payloadObj.role || payloadObj.roles || payloadObj.authorities) as any;
    
    if (Array.isArray(role) && role.length > 0) {
      const roleStr = role[0].toString().toUpperCase();
      return roleStr.includes('ADMIN') ? 'ADMIN' : 'USER';
    }
    
    if (typeof role === 'string') {
      const roleStr = role.toUpperCase();
      return roleStr.includes('ADMIN') ? 'ADMIN' : 'USER';
    }
    
    return 'USER';
  } catch {
    return 'USER';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const initAuth = () => {
      const token = getAuthToken();
      const storedUser = localStorage.getItem(USER_KEY);

      if (token && !isTokenExpired(token)) {
        try {
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser) as User;
            // Ensure role is always extracted from token as backup
            if (!parsedUser.role) {
              parsedUser.role = getRoleFromToken(token) || 'USER';
              localStorage.setItem(USER_KEY, JSON.stringify(parsedUser));
            }
            setUser(parsedUser);
          } else {
            // Token exists but no stored user - create from token
            const roleFromToken = getRoleFromToken(token) || 'USER';
            const userData: User = {
              id: 0,
              email: '',
              username: '',
              role: roleFromToken,
            };
            setUser(userData);
          }
        } catch {
          // Invalid stored user, clear auth
          clearAuthToken();
          localStorage.removeItem(USER_KEY);
          setUser(null);
        }
      } else if (token && isTokenExpired(token)) {
        // Token expired, clear auth
        clearAuthToken();
        localStorage.removeItem(USER_KEY);
        setUser(null);
      } else {
        setUser(null);
      }

      setIsLoading(false);
    };

    initAuth();

    // Listen for storage changes from other tabs
    const handleStorageChange = () => {
      initAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiSignIn({ username, password });
      
      // Store token using utility
      storeAuthToken(response.token, { role: response.role, expiresAt: response.expiresAt });
      
      // Extract role from token if not in response
      const roleFromResponse = response.role as 'USER' | 'ADMIN' | undefined;
      const roleFromToken = getRoleFromToken(response.token);
      const finalRole = roleFromResponse || roleFromToken || 'USER';
      
      // Store user info
      const userData: User = {
        id: 0,
        email: username,
        username,
        role: finalRole,
      };
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      
      setUser(userData);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signUp = useCallback(async (username: string, email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiSignUp({ username, email, password });
      
      // Store token using utility
      storeAuthToken(response.token, { role: response.role, expiresAt: response.expiresAt });
      
      // Extract role from token if not in response
      const roleFromResponse = response.role as 'USER' | 'ADMIN' | undefined;
      const roleFromToken = getRoleFromToken(response.token);
      const finalRole = roleFromResponse || roleFromToken || 'USER';
      
      // Store user info
      const userData: User = {
        id: 0,
        email,
        username,
        role: finalRole,
      };
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      
      setUser(userData);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(() => {
    clearAuthToken();
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    signIn,
    signUp,
    signOut,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
