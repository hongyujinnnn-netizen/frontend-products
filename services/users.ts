import type { User } from '../types/user';
import { apiFetch } from './api';

interface ApiUser {
  id: number;
  username: string;
  email: string;
  role: string;
  status?: string;
}

const normalizeRole = (role: string): User['role'] =>
  role.replace(/^ROLE_/i, '').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER';
const normalizeStatus = (status?: string): User['status'] => {
  const normalized = (status ?? 'ACTIVE').trim().toUpperCase();
  if (normalized === 'DISABLED' || normalized === 'BANNED') return normalized;
  return 'ACTIVE';
};
const toApiRole = (role: User['role']) => (role === 'ADMIN' ? 'ROLE_ADMIN' : 'ROLE_USER');

export const listUsers = async (): Promise<User[]> => {
  const users = await apiFetch<ApiUser[]>('/users');
  return users.map((user) => ({
    ...user,
    role: normalizeRole(user.role),
    status: normalizeStatus(user.status),
  }));
};

export const updateUserRole = async (id: number, role: User['role']): Promise<User> => {
  const user = await apiFetch<ApiUser>(`/users/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role: toApiRole(role) }),
  });

  return {
    ...user,
    role: normalizeRole(user.role),
    status: normalizeStatus(user.status),
  };
};

export const updateUserStatus = async (id: number, status: User['status']): Promise<User> => {
  const user = await apiFetch<ApiUser>(`/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

  return {
    ...user,
    role: normalizeRole(user.role),
    status: normalizeStatus(user.status),
  };
};

export const deleteUser = (id: number) =>
  apiFetch<void>(`/users/${id}`, {
    method: 'DELETE',
  });
