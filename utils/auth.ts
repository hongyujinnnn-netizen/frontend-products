const TOKEN_KEY = 'auth_token';
const ROLE_KEY = 'auth_role';
const EXPIRES_KEY = 'auth_expires_at';

const isBrowser = () => typeof window !== 'undefined';

const normalizeRole = (role: string) => role.replace(/^ROLE_/i, '').toUpperCase();

export const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  const [, payload] = token.split('.');
  if (!payload) return null;

  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');

  try {
    if (typeof atob !== 'function') return null;
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
};

export const isTokenExpired = (token: string): boolean => {
  const payload = decodeJwtPayload(token);
  if (!payload) return true;

  const now = Math.floor(Date.now() / 1000);
  const expRaw = payload.exp;
  const exp =
    typeof expRaw === 'number'
      ? expRaw
      : typeof expRaw === 'string'
        ? Number(expRaw)
        : Number.NaN;
  if (!Number.isFinite(exp)) return true;
  return exp < now;
};

export const getRoleFromToken = (token: string): 'USER' | 'ADMIN' | null => {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  const role = payload.role ?? payload.roles ?? payload.authorities;

  let roleStr: string | undefined;
  if (Array.isArray(role) && role.length > 0) {
    roleStr = String(role[0]);
  } else if (typeof role === 'string') {
    roleStr = role;
  }

  if (!roleStr) return 'USER';
  return roleStr.toUpperCase().includes('ADMIN') ? 'ADMIN' : 'USER';
};

export const getIdentityFromToken = (token: string) => {
  const payload = decodeJwtPayload(token);
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

export const storeAuthToken = (
  token: string,
  metadata?: { role?: string; expiresAt?: string }
) => {
  if (!isBrowser()) return;
  localStorage.setItem(TOKEN_KEY, token);
  if (metadata?.role) localStorage.setItem(ROLE_KEY, normalizeRole(metadata.role));
  if (metadata?.expiresAt) localStorage.setItem(EXPIRES_KEY, metadata.expiresAt);
};

export const getAuthToken = () => {
  if (!isBrowser()) return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const clearAuthToken = () => {
  if (!isBrowser()) return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(EXPIRES_KEY);
};

export const isAuthenticated = () => {
  if (!isBrowser()) return false;
  const token = getAuthToken();
  if (!token) return false;

  const expiresAt = localStorage.getItem(EXPIRES_KEY);
  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
    clearAuthToken();
    return false;
  }
  return true;
};

export const hasRequiredRole = (requiredRole: string) => {
  if (!isBrowser()) return false;
  if (!requiredRole) return true;

  const storedRole = localStorage.getItem(ROLE_KEY);
  if (storedRole) return normalizeRole(storedRole) === normalizeRole(requiredRole);

  const token = getAuthToken();
  if (!token) return false;

  const inferredRole = getRoleFromToken(token);
  if (!inferredRole) return false;

  const normalized = normalizeRole(inferredRole);
  localStorage.setItem(ROLE_KEY, normalized);
  return normalized === normalizeRole(requiredRole);
};
