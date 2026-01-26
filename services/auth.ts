import type { LoginRequest, LoginResponse, RegisterRequest } from '../types/api';
import { apiFetch } from './api';
import { clearAuthToken, storeAuthToken } from '../utils/auth';

export const signIn = async (payload: LoginRequest) => {
  const data = await apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  storeAuthToken(data.token, { role: data.role, expiresAt: data.expiresAt });
  return data;
};

export const signUp = async (payload: RegisterRequest) => {
  const data = await apiFetch<LoginResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  storeAuthToken(data.token, { role: data.role, expiresAt: data.expiresAt });
  return data;
};

export const signOut = () => {
  clearAuthToken();
};
