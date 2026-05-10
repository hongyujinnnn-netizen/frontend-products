import { useCallback } from 'react';
import useSWR from 'swr';
import type { User } from '../types/user';
import { listUsers, deleteUser, updateUserRole, updateUserStatus } from '../services/users';
import { getErrorMessage } from '../services/apiError';

export function useUsers() {
  const { data, error: fetchError, isLoading, mutate } = useSWR<User[]>(
    '/users',
    async () => listUsers(),
  );

  const users = data ?? [];
  const error = fetchError ? getErrorMessage(fetchError) : null;

  const loadUsers = useCallback(async () => {
    await mutate();
  }, [mutate]);

  const removeUser = useCallback(
    async (id: number) => {
      try {
        await deleteUser(id);
        await mutate((current = []) => current.filter((u) => u.id !== id), { revalidate: false });
      } catch (err) {
        throw err;
      }
    },
    [mutate],
  );

  const changeUserRole = useCallback(
    async (id: number, role: User['role']) => {
      const updated = await updateUserRole(id, role);
      await mutate(
        (current = []) => current.map((u) => (u.id === id ? { ...u, role: updated.role } : u)),
        { revalidate: false },
      );
      return updated;
    },
    [mutate],
  );

  const changeUserStatus = useCallback(
    async (id: number, status: User['status']) => {
      const updated = await updateUserStatus(id, status);
      await mutate(
        (current = []) => current.map((u) => (u.id === id ? { ...u, status: updated.status } : u)),
        { revalidate: false },
      );
      return updated;
    },
    [mutate],
  );

  return {
    users,
    loading: isLoading,
    error,
    loadUsers,
    removeUser,
    changeUserRole,
    changeUserStatus,
  };
}
