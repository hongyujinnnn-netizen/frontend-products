const TOKEN_KEY = 'auth_token';
const ROLE_KEY = 'auth_role';
const EXPIRES_KEY = 'auth_expires_at';

const isBrowser = () => typeof window !== 'undefined';

const normalizeRole = (role: string) => role.replace(/^ROLE_/i, '').toUpperCase();

const decodeJwtPayload = (token: string) => {
  const [, payload] = token.split('.');

  if (!payload) {
    return null;
  }

  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');

  try {
    if (typeof atob !== 'function') {
      return null;
    }

    const decoded = atob(padded);

    return JSON.parse(decoded) as Record<string, unknown>;
  } catch (_error) {
    return null;
  }
};

const extractRole = (token: string) => {
  const payload = decodeJwtPayload(token);

  if (!payload) {
    return undefined;
  }

  const rawRole = (payload.role ?? payload.roles ?? payload.authorities) as unknown;

  if (!rawRole) {
    return undefined;
  }

  if (Array.isArray(rawRole)) {
    return rawRole[0] as string | undefined;
  }

  if (typeof rawRole === 'string') {
    return rawRole;
  }

  return undefined;
};

export const storeAuthToken = (
  token: string,
  metadata?: { role?: string; expiresAt?: string }
) => {
  if (!isBrowser()) {
    return;
  }

  localStorage.setItem(TOKEN_KEY, token);

  if (metadata?.role) {
    localStorage.setItem(ROLE_KEY, normalizeRole(metadata.role));
  }

  if (metadata?.expiresAt) {
    localStorage.setItem(EXPIRES_KEY, metadata.expiresAt);
  }
};

export const getAuthToken = () => {
  if (!isBrowser()) {
    return null;
  }

  return localStorage.getItem(TOKEN_KEY);
};

export const clearAuthToken = () => {
  if (!isBrowser()) {
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(EXPIRES_KEY);
};

export const isAuthenticated = () => {
  if (!isBrowser()) {
    return false;
  }

  const token = getAuthToken();

  if (!token) {
    return false;
  }

  const expiresAt = localStorage.getItem(EXPIRES_KEY);

  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
    clearAuthToken();
    return false;
  }

  return true;
};

export const hasRequiredRole = (requiredRole: string) => {
  if (!isBrowser()) {
    return false;
  }

  if (!requiredRole) {
    return true;
  }

  const storedRole = localStorage.getItem(ROLE_KEY);

  if (storedRole) {
    return normalizeRole(storedRole) === normalizeRole(requiredRole);
  }

  const token = getAuthToken();

  if (!token) {
    return false;
  }

  const inferredRole = extractRole(token);

  if (!inferredRole) {
    return false;
  }

  const normalized = normalizeRole(inferredRole);
  localStorage.setItem(ROLE_KEY, normalized);

  return normalized === normalizeRole(requiredRole);
};
