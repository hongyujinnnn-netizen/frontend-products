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
  [key: string]: unknown;
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
  const expRaw = payload.exp;
  const exp =
    typeof expRaw === 'number'
      ? expRaw
      : typeof expRaw === 'string'
        ? Number(expRaw)
        : Number.NaN;
  if (!Number.isFinite(exp)) {
    return true;
  }
  return exp < now;
}

/**
 * Extract role from JWT token
 */
function getRoleFromToken(token: string): 'USER' | 'ADMIN' | null {
  try {
    const payload = decodeToken(token);
    if (!payload) return null;

    const role = payload.role || payload.roles || payload.authorities;
    
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

const getIdentityFromToken = (token: string) => {
  const payload = decodeToken(token);
  if (!payload) {
    return { id: 0, username: '', email: '' };
  }

  const pickString = (value: unknown) =>
    typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

  const username =
    pickString(payload.username) ||
    pickString(payload.userName) ||
    pickString(payload.preferred_username) ||
    pickString(payload.sub) ||
    pickString(payload.name) ||
    '';

  let email = pickString(payload.email) || '';
  if (!email && username.includes('@')) {
    email = username;
  }

  const idRaw = payload.userId ?? payload.id ?? payload.user_id ?? payload.sub;
  const id =
    typeof idRaw === 'number'
      ? idRaw
      : typeof idRaw === 'string' && /^\d+$/.test(idRaw)
        ? Number(idRaw)
        : 0;

  return { id, username, email };
};

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
        const tokenIdentity = getIdentityFromToken(token);
        try {
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser) as User;
            // Ensure role is always extracted from token as backup
            if (!parsedUser.role) {
              parsedUser.role = getRoleFromToken(token) || 'USER';
            }
            if (!parsedUser.status) {
              parsedUser.status = 'ACTIVE';
            }
            if (!parsedUser.username && tokenIdentity.username) {
              parsedUser.username = tokenIdentity.username;
            }
            if (!parsedUser.email && tokenIdentity.email) {
              parsedUser.email = tokenIdentity.email;
            }
            if (!parsedUser.id && tokenIdentity.id) {
              parsedUser.id = tokenIdentity.id;
            }
            localStorage.setItem(USER_KEY, JSON.stringify(parsedUser));
            setUser(parsedUser);
          } else {
            // Token exists but no stored user - create from token
            const roleFromToken = getRoleFromToken(token) || 'USER';
            const fallbackName = tokenIdentity.username || tokenIdentity.email || '';
            const userData: User = {
              id: tokenIdentity.id || 0,
              email: tokenIdentity.email,
              username: fallbackName,
              role: roleFromToken,
              status: 'ACTIVE',
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
      const tokenIdentity = getIdentityFromToken(response.token);
      const normalizedEmail =
        username.includes('@') ? username : tokenIdentity.email;
      const normalizedUsername = username || tokenIdentity.username;

      const userData: User = {
        id: tokenIdentity.id || 0,
        email: normalizedEmail || '',
        username: normalizedUsername || '',
        role: finalRole,
        status: 'ACTIVE',
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
      const tokenIdentity = getIdentityFromToken(response.token);
      const userData: User = {
        id: tokenIdentity.id || 0,
        email,
        username,
        role: finalRole,
        status: 'ACTIVE',
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
