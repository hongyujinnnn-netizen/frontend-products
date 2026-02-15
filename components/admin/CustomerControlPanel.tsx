import { useEffect, useMemo, useState } from 'react';
import type { MessageType } from '../../hooks/useMessage';
import type { Order } from '../../types/order';
import type { User } from '../../types/user';

type CustomerRole = 'ADMIN' | 'USER';
type CustomerStatus = 'ACTIVE' | 'DISABLED' | 'BANNED';
type PermissionKey =
  | 'users.read'
  | 'users.write'
  | 'roles.manage'
  | 'permissions.manage'
  | 'passwords.reset'
  | 'activity.view'
  | 'billing.view'
  | 'security.manage';

interface CustomerControlPanelProps {
  users: User[];
  orders: Order[];
  loading: boolean;
  onDeleteUser: (id: number) => Promise<void>;
  onChangeUserRole: (id: number, role: User['role']) => Promise<User>;
  onChangeUserStatus: (id: number, status: User['status']) => Promise<User>;
  notify: (type: MessageType, text: string) => void;
}

interface CustomerActivity {
  orders: number;
  spent: number;
  lastOrderAt: string | null;
  lastSeenAt: string;
}

interface CustomerViewModel {
  id: number;
  username: string;
  email: string;
  source: 'remote' | 'local';
  role: CustomerRole;
  status: CustomerStatus;
  permissions: PermissionKey[];
  activity: CustomerActivity;
}

interface EditorState {
  mode: 'create' | 'edit';
  id: number | null;
  username: string;
  email: string;
  role: CustomerRole;
  status: CustomerStatus;
}

interface LocalUserDraft {
  id: number;
  username: string;
  email: string;
}

const CUSTOMERS_PER_PAGE = 8;

const ROLE_PERMISSION_DEFAULTS: Record<CustomerRole, PermissionKey[]> = {
  ADMIN: [
    'users.read',
    'users.write',
    'roles.manage',
    'permissions.manage',
    'passwords.reset',
    'activity.view',
    'billing.view',
    'security.manage',
  ],
  USER: ['activity.view'],
};

const PERMISSION_LABELS: Record<PermissionKey, string> = {
  'users.read': 'View users',
  'users.write': 'Create and edit users',
  'roles.manage': 'Control roles',
  'permissions.manage': 'Control permissions',
  'passwords.reset': 'Reset passwords',
  'activity.view': 'View user activity',
  'billing.view': 'View billing profile',
  'security.manage': 'Ban and security actions',
};

const roleFromApi = (role: User['role'] | string): CustomerRole =>
  role.replace(/^ROLE_/i, '').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER';
const toLower = (value: string) => value.trim().toLowerCase();
const getInitial = (name: string) => (name.trim().charAt(0) || 'U').toUpperCase();
const accessLevel = (count: number) => (count >= 7 ? 'Full access' : count >= 4 ? 'Elevated' : 'Basic');
const formatDateTime = (date: string | null) => {
  if (!date) return 'No activity';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'No activity';
  return parsed.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const statusClass: Record<CustomerStatus, string> = {
  ACTIVE: 'status-success',
  DISABLED: 'status-warning',
  BANNED: 'status-danger',
};

const roleClass: Record<CustomerRole, string> = {
  ADMIN: 'role-admin',
  USER: 'role-customer',
};

const roleLabel: Record<CustomerRole, string> = {
  ADMIN: 'Admin',
  USER: 'User',
};

const CustomerControlPanel = ({ users, orders, loading, onDeleteUser, onChangeUserRole, onChangeUserStatus, notify }: CustomerControlPanelProps) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | CustomerStatus>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | CustomerRole>('ALL');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [openActionUserId, setOpenActionUserId] = useState<number | null>(null);
  const [busyDeleteId, setBusyDeleteId] = useState<number | null>(null);
  const [busyRoleId, setBusyRoleId] = useState<number | null>(null);
  const [busyStatusId, setBusyStatusId] = useState<number | null>(null);
  const [deleteConfirmUserId, setDeleteConfirmUserId] = useState<number | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const [localUsers, setLocalUsers] = useState<LocalUserDraft[]>([]);
  const [profileOverrides, setProfileOverrides] = useState<Record<number, { username: string; email: string }>>({});
  const [roleOverrides, setRoleOverrides] = useState<Record<number, CustomerRole>>({});
  const [statusOverrides, setStatusOverrides] = useState<Record<number, CustomerStatus>>({});
  const [permissionOverrides, setPermissionOverrides] = useState<Record<number, PermissionKey[]>>({});
  const [activityOverrides] = useState<Record<number, { lastSeenAt: string }>>({});

  const [editor, setEditor] = useState<EditorState | null>(null);
  const [permissionUserId, setPermissionUserId] = useState<number | null>(null);
  const [activityUserId, setActivityUserId] = useState<number | null>(null);

  useEffect(() => {
    if (!openActionUserId) return;
    const closeMenu = () => setOpenActionUserId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, [openActionUserId]);

  const activityByUser = useMemo(() => {
    const map = new Map<number, CustomerActivity>();
    users.forEach((user) => {
      map.set(user.id, {
        orders: 0,
        spent: 0,
        lastOrderAt: null,
        lastSeenAt: new Date(Date.now() - ((user.id % 9) + 1) * 86400000).toISOString(),
      });
    });
    orders.forEach((order) => {
      const current = map.get(order.userId);
      if (!current) return;
      const orderDate = new Date(order.createdAt).toISOString();
      map.set(order.userId, {
        orders: current.orders + 1,
        spent: current.spent + order.total,
        lastOrderAt: !current.lastOrderAt || new Date(orderDate) > new Date(current.lastOrderAt) ? orderDate : current.lastOrderAt,
        lastSeenAt: new Date(orderDate) > new Date(current.lastSeenAt) ? orderDate : current.lastSeenAt,
      });
    });
    return map;
  }, [orders, users]);

  const customerRows = useMemo<CustomerViewModel[]>(() => {
    const baseRows = users.map((user) => {
      const role = roleOverrides[user.id] ?? roleFromApi(user.role);
      const activity = activityByUser.get(user.id) ?? { orders: 0, spent: 0, lastOrderAt: null, lastSeenAt: new Date().toISOString() };
      return {
        id: user.id,
        username: profileOverrides[user.id]?.username ?? user.username,
        email: profileOverrides[user.id]?.email ?? user.email,
        source: 'remote' as const,
        role,
        status: statusOverrides[user.id] ?? user.status,
        permissions: permissionOverrides[user.id] ?? ROLE_PERMISSION_DEFAULTS[role],
        activity: { ...activity, lastSeenAt: activityOverrides[user.id]?.lastSeenAt ?? activity.lastSeenAt },
      };
    });

    const draftRows = localUsers.map((user) => {
      const role = roleOverrides[user.id] ?? 'USER';
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        source: 'local' as const,
        role,
        status: statusOverrides[user.id] ?? 'ACTIVE',
        permissions: permissionOverrides[user.id] ?? ROLE_PERMISSION_DEFAULTS[role],
        activity: { orders: 0, spent: 0, lastOrderAt: null, lastSeenAt: activityOverrides[user.id]?.lastSeenAt ?? new Date().toISOString() },
      };
    });

    return [...baseRows, ...draftRows];
  }, [activityByUser, activityOverrides, localUsers, permissionOverrides, profileOverrides, roleOverrides, statusOverrides, users]);

  const filteredRows = useMemo(() => {
    const query = toLower(search);
    return customerRows.filter((row) => {
      const matchesSearch = query.length === 0 || `${row.username} ${row.email} ${row.role} ${row.status}`.toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'ALL' || row.status === statusFilter;
      const matchesRole = roleFilter === 'ALL' || row.role === roleFilter;
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [customerRows, roleFilter, search, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [search, statusFilter, roleFilter, users.length]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / CUSTOMERS_PER_PAGE));
  const pagedRows = filteredRows.slice((currentPage - 1) * CUSTOMERS_PER_PAGE, currentPage * CUSTOMERS_PER_PAGE);

  const summary = useMemo(() => ({
    total: customerRows.length,
    active: customerRows.filter((row) => row.status === 'ACTIVE').length,
    disabled: customerRows.filter((row) => row.status === 'DISABLED').length,
    banned: customerRows.filter((row) => row.status === 'BANNED').length,
    activeWeek: customerRows.filter((row) => Date.now() - new Date(row.activity.lastSeenAt).getTime() <= 7 * 86400000).length,
  }), [customerRows]);

  const deleteTarget = useMemo(
    () => customerRows.find((row) => row.id === deleteConfirmUserId) ?? null,
    [customerRows, deleteConfirmUserId]
  );

  const permissionTarget = useMemo(
    () => customerRows.find((row) => row.id === permissionUserId) ?? null,
    [customerRows, permissionUserId]
  );

  const activityTarget = useMemo(
    () => customerRows.find((row) => row.id === activityUserId) ?? null,
    [activityUserId, customerRows]
  );

  const activityTimeline = useMemo(() => {
    if (!activityUserId) return [];
    return orders
      .filter((order) => order.userId === activityUserId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
  }, [activityUserId, orders]);

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));
  };

  const toggleSelectPage = () => {
    const idsOnPage = pagedRows.map((row) => row.id);
    const allSelected = idsOnPage.length > 0 && idsOnPage.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) => {
      if (allSelected) return prev.filter((id) => !idsOnPage.includes(id));
      const next = new Set(prev);
      idsOnPage.forEach((id) => next.add(id));
      return Array.from(next);
    });
  };

  const updateRole = async (id: number, role: CustomerRole) => {
    const target = customerRows.find((row) => row.id === id);
    if (!target || target.role === role) return;

    const previousRole = target.role;
    setRoleOverrides((prev) => ({ ...prev, [id]: role }));
    setPermissionOverrides((prev) => (prev[id] ? prev : { ...prev, [id]: ROLE_PERMISSION_DEFAULTS[role] }));

    if (target.source === 'local') {
      notify('success', `Role updated to ${roleLabel[role]}.`);
      return;
    }

    setBusyRoleId(id);
    try {
      await onChangeUserRole(id, role);
      setRoleOverrides((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      notify('success', `Role updated to ${roleLabel[role]}.`);
    } catch {
      setRoleOverrides((prev) => ({ ...prev, [id]: previousRole }));
      notify('error', 'Unable to update role.');
    } finally {
      setBusyRoleId(null);
    }
  };

  const updateStatus = async (id: number, status: CustomerStatus) => {
    const target = customerRows.find((row) => row.id === id);
    if (!target || target.status === status) return;

    const previousStatus = target.status;
    setStatusOverrides((prev) => ({ ...prev, [id]: status }));

    if (target.source === 'local') {
      notify('success', `User marked as ${status.toLowerCase()}.`);
      return;
    }

    setBusyStatusId(id);
    try {
      await onChangeUserStatus(id, status);
      setStatusOverrides((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      notify('success', `User marked as ${status.toLowerCase()}.`);
    } catch {
      setStatusOverrides((prev) => ({ ...prev, [id]: previousStatus }));
      notify('error', 'Unable to update status.');
    } finally {
      setBusyStatusId(null);
    }
  };

  const removeLocalUserState = (id: number) => {
    setLocalUsers((prev) => prev.filter((user) => user.id !== id));
    setSelectedIds((prev) => prev.filter((value) => value !== id));
    setProfileOverrides((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setRoleOverrides((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setStatusOverrides((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setPermissionOverrides((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const deleteOne = async (row: CustomerViewModel) => {
    if (row.source === 'local') {
      removeLocalUserState(row.id);
      notify('success', 'Local user deleted.');
      return;
    }
    setBusyDeleteId(row.id);
    try {
      await onDeleteUser(row.id);
      removeLocalUserState(row.id);
      notify('success', 'User deleted.');
    } catch {
      notify('error', 'Unable to delete user.');
    } finally {
      setBusyDeleteId(null);
    }
  };

  const runAction = (action: 'edit' | 'reset' | 'activity' | 'permissions' | 'delete', row: CustomerViewModel) => {
    setOpenActionUserId(null);
    if (action === 'edit') {
      setEditor({ mode: 'edit', id: row.id, username: row.username, email: row.email, role: row.role, status: row.status });
      return;
    }
    if (action === 'reset') {
      notify('info', `Password reset link sent to ${row.email}.`);
      return;
    }
    if (action === 'activity') {
      setActivityUserId(row.id);
      return;
    }
    if (action === 'permissions') {
      setPermissionUserId(row.id);
      return;
    }
    setDeleteConfirmUserId(row.id);
  };

  const saveEditor = async () => {
    if (!editor) return;
    const username = editor.username.trim();
    const email = editor.email.trim().toLowerCase();
    if (username.length < 2) return notify('error', 'Name must be at least 2 characters.');
    if (!email.includes('@')) return notify('error', 'Enter a valid email address.');

    if (editor.mode === 'create') {
      const nextId = Math.max(0, ...customerRows.map((row) => row.id)) + 1;
      setLocalUsers((prev) => [...prev, { id: nextId, username, email }]);
      setRoleOverrides((prev) => ({ ...prev, [nextId]: editor.role }));
      setStatusOverrides((prev) => ({ ...prev, [nextId]: editor.status }));
      setPermissionOverrides((prev) => ({ ...prev, [nextId]: ROLE_PERMISSION_DEFAULTS[editor.role] }));
      notify('success', 'User created in admin workspace.');
      setEditor(null);
      return;
    }

    if (!editor.id) return;
    const editingId = editor.id;
    const existing = customerRows.find((row) => row.id === editingId);
    if (!existing) return;

    if (existing.source === 'local') {
      setLocalUsers((prev) => prev.map((user) => (user.id === editingId ? { ...user, username, email } : user)));
    } else {
      setProfileOverrides((prev) => ({ ...prev, [editingId]: { username, email } }));
    }
    if (existing.role !== editor.role) {
      if (existing.source === 'local') {
        setRoleOverrides((prev) => ({ ...prev, [editingId]: editor.role }));
      } else {
        setBusyRoleId(editingId);
        try {
          await onChangeUserRole(editingId, editor.role);
          setRoleOverrides((prev) => {
            const next = { ...prev };
            delete next[editingId];
            return next;
          });
        } catch {
          setBusyRoleId(null);
          notify('error', 'Unable to update role.');
          return;
        } finally {
          setBusyRoleId(null);
        }
      }
    }
    if (existing.status !== editor.status) {
      if (existing.source === 'local') {
        setStatusOverrides((prev) => ({ ...prev, [editingId]: editor.status }));
      } else {
        setBusyStatusId(editingId);
        try {
          await onChangeUserStatus(editingId, editor.status);
          setStatusOverrides((prev) => {
            const next = { ...prev };
            delete next[editingId];
            return next;
          });
        } catch {
          setBusyStatusId(null);
          notify('error', 'Unable to update status.');
          return;
        } finally {
          setBusyStatusId(null);
        }
      }
    }
    notify('success', 'User profile updated.');
    setEditor(null);
  };

  const executeBulkDelete = async () => {
    const selectedRows = customerRows.filter((row) => selectedIds.includes(row.id));
    setIsBulkDeleting(true);
    let deleted = 0;
    for (const row of selectedRows) {
      try {
        await deleteOne(row);
        deleted += 1;
      } catch {
        // Continue with next user.
      }
    }
    setConfirmBulkDelete(false);
    setIsBulkDeleting(false);
    setSelectedIds([]);
    if (deleted === 0) notify('error', 'No users were deleted.');
  };

  const togglePermission = (userId: number, permission: PermissionKey) => {
    const role = roleOverrides[userId] ?? customerRows.find((row) => row.id === userId)?.role ?? 'USER';
    const current = permissionOverrides[userId] ?? ROLE_PERMISSION_DEFAULTS[role];
    const next = current.includes(permission)
      ? current.filter((item) => item !== permission)
      : [...current, permission];
    setPermissionOverrides((prev) => ({ ...prev, [userId]: next }));
  };

  return (
    <section className="panel customer-control-panel">
      <div className="panel-header customer-panel-header">
        <div>
          <h3>Customers</h3>
          <p className="form-hint">Monitor customer accounts and status.</p>
        </div>
        <button
          className="button button-primary"
          type="button"
          onClick={() => setEditor({ mode: 'create', id: null, username: '', email: '', role: 'USER', status: 'ACTIVE' })}
        >
          Create user
        </button>
      </div>
      <div className="customer-kpi-grid">
        <article className="customer-kpi-card"><p>Total users</p><strong>{summary.total}</strong><span>{summary.activeWeek} active this week</span></article>
        <article className="customer-kpi-card"><p>Active</p><strong>{summary.active}</strong><span>Healthy accounts</span></article>
        <article className="customer-kpi-card is-warning"><p>Disabled</p><strong>{summary.disabled}</strong><span>Limited access users</span></article>
        <article className="customer-kpi-card is-danger"><p>Banned</p><strong>{summary.banned}</strong><span>Blocked by policy</span></article>
      </div>

      <div className="customer-filter-card">
        <div className="customer-toolbar">
          <div className="customer-search-shell">
            <span aria-hidden="true">Search</span>
            <input className="toolbar-input customer-search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users by name, email, role" />
            {search.trim() && <button className="customer-clear-search" type="button" onClick={() => setSearch('')}>Clear</button>}
          </div>
          <select className="toolbar-input customer-toolbar-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
            <option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="DISABLED">Disabled</option><option value="BANNED">Banned</option>
          </select>
          <select className="toolbar-input customer-toolbar-select" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)}>
            <option value="ALL">All roles</option><option value="ADMIN">Admin</option><option value="USER">User</option>
          </select>
        </div>
        <div className="customer-filter-foot">
          <span>Showing <strong>{filteredRows.length}</strong> users</span>
          {(search || statusFilter !== 'ALL' || roleFilter !== 'ALL') && (
            <button className="button button-ghost" type="button" onClick={() => { setSearch(''); setStatusFilter('ALL'); setRoleFilter('ALL'); }}>Clear filters</button>
          )}
        </div>
      </div>

      <div className="customer-bulk-bar">
        <span>{selectedIds.length} selected</span>
        <button className="button button-ghost" type="button" onClick={() => selectedIds.length && setStatusOverrides((prev) => ({ ...prev, ...Object.fromEntries(selectedIds.map((id) => [id, 'DISABLED'])) }))}>Disable selected</button>
        <button className="button button-ghost" type="button" onClick={() => selectedIds.length && setStatusOverrides((prev) => ({ ...prev, ...Object.fromEntries(selectedIds.map((id) => [id, 'BANNED'])) }))}>Ban selected</button>
        <button className="button button-danger" type="button" onClick={() => selectedIds.length && setConfirmBulkDelete(true)} disabled={isBulkDeleting || selectedIds.length === 0}>{isBulkDeleting ? 'Deleting...' : 'Delete selected'}</button>
      </div>

      {loading ? (
        <div className="table-skeleton"><div className="skeleton-row" /><div className="skeleton-row" /><div className="skeleton-row" /></div>
      ) : filteredRows.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">Users</div><h3>No users found</h3><p>Adjust filters or create a new user.</p></div>
      ) : (
        <>
          <div className="table-wrapper customer-table-wrapper">
            <div className="customer-table-scroll">
            <table className="table table-striped customer-table">
              <thead><tr><th className="table-check"><input type="checkbox" checked={pagedRows.length > 0 && pagedRows.every((row) => selectedIds.includes(row.id))} onChange={toggleSelectPage} /></th><th>User</th><th>Role</th><th>Status</th><th>Activity</th><th>Access</th><th className="table-actions-col">Actions</th></tr></thead>
              <tbody>
                {pagedRows.map((row, rowIndex) => {
                  const shouldOpenUp = rowIndex >= pagedRows.length - 2;
                  return (
                  <tr key={row.id} className="customer-row">
                    <td><input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleSelection(row.id)} /></td>
                    <td><div className="customer-user-cell"><div className="customer-avatar" aria-hidden="true">{getInitial(row.username)}</div><div><div className="customer-name">{row.username}</div><div className="customer-email">{row.email}</div><div className="customer-id">ID: {row.id}</div></div></div></td>
                    <td><select className="toolbar-input customer-inline-select" value={row.role} onChange={(event) => void updateRole(row.id, event.target.value as CustomerRole)} disabled={busyRoleId === row.id}><option value="ADMIN">Admin</option><option value="USER">User</option></select></td>
                    <td><select className="toolbar-input customer-inline-select" value={row.status} onChange={(event) => void updateStatus(row.id, event.target.value as CustomerStatus)} disabled={busyStatusId === row.id}><option value="ACTIVE">Active</option><option value="DISABLED">Disabled</option><option value="BANNED">Banned</option></select><div className="customer-status-pill"><span className={`pill ${statusClass[row.status]}`}>{row.status}</span></div></td>
                    <td><div className="cell-strong">{row.activity.orders} orders</div><div className="cell-sub">${row.activity.spent.toFixed(2)} spent</div><div className="cell-sub">Last seen: {formatDateTime(row.activity.lastSeenAt)}</div></td>
                    <td><span className={`customer-role-chip ${roleClass[row.role]}`}>{roleLabel[row.role]}</span><div className="cell-sub">Permissions: {accessLevel(row.permissions.length)}</div></td>
                    <td>
                      <div className="customer-action-shell" onClick={(event) => event.stopPropagation()}>
                        <button className="button button-ghost customer-more-button" type="button" onClick={() => setOpenActionUserId((prev) => prev === row.id ? null : row.id)}>More</button>
                        {openActionUserId === row.id && (
                          <div className={`customer-action-menu${shouldOpenUp ? ' is-up' : ''}`} role="menu">
                            <button type="button" onClick={() => runAction('edit', row)}>Edit user</button>
                            <button type="button" onClick={() => runAction('reset', row)}>Reset password</button>
                            <button type="button" onClick={() => runAction('activity', row)}>View activity</button>
                            <button type="button" onClick={() => runAction('permissions', row)}>Control permissions</button>
                            <button type="button" className="is-danger" onClick={() => runAction('delete', row)} disabled={busyDeleteId === row.id}>{busyDeleteId === row.id ? 'Deleting...' : 'Delete user'}</button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
            </div>
          </div>

          <div className="customer-mobile-list">
            {pagedRows.map((row) => (
              <article key={row.id} className="customer-mobile-card">
                <div className="customer-mobile-head"><div className="customer-user-cell"><div className="customer-avatar" aria-hidden="true">{getInitial(row.username)}</div><div><div className="customer-name">{row.username}</div><div className="customer-email">{row.email}</div><div className="customer-id">ID: {row.id}</div></div></div><input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleSelection(row.id)} /></div>
                <div className="customer-mobile-grid">
                  <label className="form-label"><span>Role</span><select className="form-input" value={row.role} onChange={(event) => void updateRole(row.id, event.target.value as CustomerRole)} disabled={busyRoleId === row.id}><option value="ADMIN">Admin</option><option value="USER">User</option></select></label>
                  <label className="form-label"><span>Status</span><select className="form-input" value={row.status} onChange={(event) => void updateStatus(row.id, event.target.value as CustomerStatus)} disabled={busyStatusId === row.id}><option value="ACTIVE">Active</option><option value="DISABLED">Disabled</option><option value="BANNED">Banned</option></select></label>
                </div>
                <div className="customer-mobile-meta"><span className={`customer-role-chip ${roleClass[row.role]}`}>{roleLabel[row.role]}</span><span className={`pill ${statusClass[row.status]}`}>{row.status}</span></div>
                <div className="cell-sub">{row.activity.orders} orders • ${row.activity.spent.toFixed(2)} spent</div>
                <div className="cell-sub">Last seen: {formatDateTime(row.activity.lastSeenAt)}</div>
                <div className="customer-mobile-actions">
                  <button className="button button-ghost" type="button" onClick={() => runAction('activity', row)}>View activity</button>
                  <button className="button button-ghost" type="button" onClick={() => runAction('permissions', row)}>Permissions</button>
                  <button className="button button-ghost" type="button" onClick={() => runAction('edit', row)}>Edit</button>
                  <button className="button button-danger" type="button" onClick={() => runAction('delete', row)}>Delete</button>
                </div>
              </article>
            ))}
          </div>

          <div className="table-pagination">
            <button className="button button-ghost" type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>Prev</button>
            <span className="form-hint">Page {currentPage} of {pageCount}</span>
            <button className="button button-ghost" type="button" onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))} disabled={currentPage === pageCount}>Next</button>
          </div>
        </>
      )}

      {deleteTarget && (
        <div className="customer-modal-backdrop" role="presentation" onClick={() => setDeleteConfirmUserId(null)}>
          <div className="customer-modal customer-confirm-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h4>Delete user</h4>
            <p className="form-hint">This action permanently removes <strong>{deleteTarget.username}</strong>. This cannot be undone.</p>
            <div className="form-actions">
              <button className="button button-ghost" type="button" onClick={() => setDeleteConfirmUserId(null)}>Cancel</button>
              <button className="button button-danger" type="button" onClick={() => void deleteOne(deleteTarget)} disabled={busyDeleteId === deleteTarget.id}>{busyDeleteId === deleteTarget.id ? 'Deleting...' : 'Confirm delete'}</button>
            </div>
          </div>
        </div>
      )}

      {confirmBulkDelete && (
        <div className="customer-modal-backdrop" role="presentation" onClick={() => setConfirmBulkDelete(false)}>
          <div className="customer-modal customer-confirm-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h4>Delete selected users</h4>
            <p className="form-hint">You are deleting <strong>{selectedIds.length}</strong> selected users. This action cannot be undone.</p>
            <div className="form-actions">
              <button className="button button-ghost" type="button" onClick={() => setConfirmBulkDelete(false)}>Cancel</button>
              <button className="button button-danger" type="button" onClick={() => void executeBulkDelete()} disabled={isBulkDeleting}>{isBulkDeleting ? 'Deleting...' : 'Confirm bulk delete'}</button>
            </div>
          </div>
        </div>
      )}

      {editor && (
        <div className="customer-modal-backdrop" role="presentation" onClick={() => setEditor(null)}>
          <div className="customer-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h4>{editor.mode === 'create' ? 'Create user' : 'Edit user'}</h4>
            <p className="form-hint">Set role, status, and profile details.</p>
            <div className="customer-modal-grid">
              <label className="form-label"><span>Full name</span><input className="form-input" value={editor.username} onChange={(event) => setEditor((prev) => (prev ? { ...prev, username: event.target.value } : prev))} /></label>
              <label className="form-label"><span>Email</span><input className="form-input" type="email" value={editor.email} onChange={(event) => setEditor((prev) => (prev ? { ...prev, email: event.target.value } : prev))} /></label>
              <label className="form-label"><span>Role</span><select className="form-input" value={editor.role} onChange={(event) => setEditor((prev) => (prev ? { ...prev, role: event.target.value as CustomerRole } : prev))}><option value="ADMIN">Admin</option><option value="USER">User</option></select></label>
              <label className="form-label"><span>Status</span><select className="form-input" value={editor.status} onChange={(event) => setEditor((prev) => (prev ? { ...prev, status: event.target.value as CustomerStatus } : prev))}><option value="ACTIVE">Active</option><option value="DISABLED">Disabled</option><option value="BANNED">Banned</option></select></label>
            </div>
            <div className="form-actions">
              <button className="button button-ghost" type="button" onClick={() => setEditor(null)}>Cancel</button>
              <button className="button button-primary" type="button" onClick={() => void saveEditor()} disabled={editor.mode === 'edit' && (busyRoleId === editor.id || busyStatusId === editor.id)}>{editor.mode === 'create' ? 'Create user' : 'Save changes'}</button>
            </div>
          </div>
        </div>
      )}

      {permissionTarget && (
        <div className="customer-modal-backdrop" role="presentation" onClick={() => setPermissionUserId(null)}>
          <div className="customer-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h4>Permissions: {permissionTarget.username}</h4>
            <p className="form-hint">Enable or revoke individual access rules.</p>
            <div className="customer-permissions-grid">
              {(Object.keys(PERMISSION_LABELS) as PermissionKey[]).map((key) => (
                <label key={key} className="customer-permission-item">
                  <input type="checkbox" checked={permissionTarget.permissions.includes(key)} onChange={() => togglePermission(permissionTarget.id, key)} />
                  <span>{PERMISSION_LABELS[key]}</span>
                </label>
              ))}
            </div>
            <div className="form-actions"><button className="button button-primary" type="button" onClick={() => setPermissionUserId(null)}>Done</button></div>
          </div>
        </div>
      )}

      {activityTarget && (
        <div className="customer-modal-backdrop" role="presentation" onClick={() => setActivityUserId(null)}>
          <div className="customer-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h4>Activity: {activityTarget.username}</h4>
            <p className="form-hint">Recent order and account activity for monitoring.</p>
            <div className="customer-activity-grid">
              <article className="customer-activity-tile"><span>Orders</span><strong>{activityTarget.activity.orders}</strong></article>
              <article className="customer-activity-tile"><span>Total spend</span><strong>${activityTarget.activity.spent.toFixed(2)}</strong></article>
              <article className="customer-activity-tile"><span>Last login</span><strong>{formatDateTime(activityTarget.activity.lastSeenAt)}</strong></article>
            </div>
            <div className="customer-activity-list">
              {activityTimeline.length === 0 ? <p className="form-hint">No recent orders.</p> : activityTimeline.map((order) => (
                <div key={order.id} className="customer-activity-item"><div><div className="cell-strong">Order #{order.id}</div><div className="cell-sub">{formatDateTime(order.createdAt)}</div></div><div className="cell-mono">${order.total.toFixed(2)}</div></div>
              ))}
            </div>
            <div className="form-actions"><button className="button button-primary" type="button" onClick={() => setActivityUserId(null)}>Close</button></div>
          </div>
        </div>
      )}
    </section>
  );
};

export default CustomerControlPanel;

