import type { User } from '../types/user';
import { apiFetch } from './api';

export const listUsers = () => apiFetch<User[]>('/users');

export const deleteUser = (id: number) =>
  apiFetch<void>(`/users/${id}`, {
    method: 'DELETE',
  });
