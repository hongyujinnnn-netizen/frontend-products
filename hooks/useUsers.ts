import { useCallback, useState } from 'react';
import type { User } from '../types/user';
import { listUsers, deleteUser, updateUserRole, updateUserStatus } from '../services/users';
import { getErrorMessage } from '../services/apiError';

/**
 * Custom hook for managing user data and operations
 * Encapsulates all user-related logic and state
 */
export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listUsers();
      setUsers(data);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const removeUser = useCallback(async (id: number) => {
    setError(null);
    try {
      await deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      throw err;
    }
  }, []);

  const changeUserRole = useCallback(async (id: number, role: User['role']) => {
    setError(null);
    try {
      const updated = await updateUserRole(id, role);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: updated.role } : u)));
      return updated;
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      throw err;
    }
  }, []);

  const changeUserStatus = useCallback(async (id: number, status: User['status']) => {
    setError(null);
    try {
      const updated = await updateUserStatus(id, status);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: updated.status } : u)));
      return updated;
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      throw err;
    }
  }, []);

  return {
    users,
    loading,
    error,
    loadUsers,
    removeUser,
    changeUserRole,
    changeUserStatus,
  };
}
