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

const roleLabel: Record<CustomerRole, string> = {
  ADMIN: 'Admin',
  USER: 'User',
};

const CustomerControlPanel = ({ users, orders, loading, onDeleteUser, onChangeUserRole, onChangeUserStatus, notify }: CustomerControlPanelProps) => {
  const statusToneClass: Record<CustomerStatus, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    DISABLED: 'bg-amber-100 text-amber-700 ring-amber-200',
    BANNED: 'bg-rose-100 text-rose-700 ring-rose-200',
  };

  const roleToneClass: Record<CustomerRole, string> = {
    ADMIN: 'bg-indigo-100 text-indigo-700 ring-indigo-200',
    USER: 'bg-slate-100 text-slate-700 ring-slate-200',
  };

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
    <section className="panel customer-control-panel rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="panel-header customer-panel-header mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Customers</h3>
          <p className="form-hint text-sm text-slate-500">Monitor customer accounts and status.</p>
        </div>
        <button
          className="button button-primary rounded-full px-4 py-2 text-sm font-medium"
          type="button"
          onClick={() => setEditor({ mode: 'create', id: null, username: '', email: '', role: 'USER', status: 'ACTIVE' })}
        >
          Create user
        </button>
      </div>
      <div className="customer-kpi-grid mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="customer-kpi-card grid gap-1 rounded-xl border border-slate-200 bg-slate-50 p-4"><p>Total users</p><strong>{summary.total}</strong><span>{summary.activeWeek} active this week</span></article>
        <article className="customer-kpi-card grid gap-1 rounded-xl border border-slate-200 bg-slate-50 p-4"><p>Active</p><strong>{summary.active}</strong><span>Healthy accounts</span></article>
        <article className="customer-kpi-card is-warning grid gap-1 rounded-xl border border-amber-200 bg-amber-50 p-4"><p>Disabled</p><strong>{summary.disabled}</strong><span>Limited access users</span></article>
        <article className="customer-kpi-card is-danger grid gap-1 rounded-xl border border-rose-200 bg-rose-50 p-4"><p>Banned</p><strong>{summary.banned}</strong><span>Blocked by policy</span></article>
      </div>

      <div className="customer-filter-card mb-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="customer-toolbar grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_180px]">
          <div className="customer-search-shell relative">
            <span aria-hidden="true">Search</span>
            <input className="toolbar-input customer-search-input h-10 w-full rounded-md border border-slate-300 bg-white px-4 text-sm focus:border-blue-500 focus:outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users by name, email, role" />
            {search.trim() && <button className="customer-clear-search rounded-full border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600" type="button" onClick={() => setSearch('')}>Clear</button>}
          </div>
          <select className="toolbar-input customer-toolbar-select h-10 rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
            <option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="DISABLED">Disabled</option><option value="BANNED">Banned</option>
          </select>
          <select className="toolbar-input customer-toolbar-select h-10 rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)}>
            <option value="ALL">All roles</option><option value="ADMIN">Admin</option><option value="USER">User</option>
          </select>
        </div>
        <div className="customer-filter-foot flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
          <span>Showing <strong>{filteredRows.length}</strong> users</span>
          {(search || statusFilter !== 'ALL' || roleFilter !== 'ALL') && (
            <button className="button button-ghost rounded-full px-3 py-1.5 text-sm" type="button" onClick={() => { setSearch(''); setStatusFilter('ALL'); setRoleFilter('ALL'); }}>Clear filters</button>
          )}
        </div>
      </div>

      <div className="customer-bulk-bar mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
        <span>{selectedIds.length} selected</span>
        <button className="button button-ghost rounded-full px-3 py-1.5 text-sm" type="button" onClick={() => selectedIds.length && setStatusOverrides((prev) => ({ ...prev, ...Object.fromEntries(selectedIds.map((id) => [id, 'DISABLED'])) }))}>Disable selected</button>
        <button className="button button-ghost rounded-full px-3 py-1.5 text-sm" type="button" onClick={() => selectedIds.length && setStatusOverrides((prev) => ({ ...prev, ...Object.fromEntries(selectedIds.map((id) => [id, 'BANNED'])) }))}>Ban selected</button>
        <button className="button button-danger rounded-full px-3 py-1.5 text-sm" type="button" onClick={() => selectedIds.length && setConfirmBulkDelete(true)} disabled={isBulkDeleting || selectedIds.length === 0}>{isBulkDeleting ? 'Deleting...' : 'Delete selected'}</button>
      </div>

      {loading ? (
        <div className="table-skeleton"><div className="skeleton-row" /><div className="skeleton-row" /><div className="skeleton-row" /></div>
      ) : filteredRows.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">Users</div><h3>No users found</h3><p>Adjust filters or create a new user.</p></div>
      ) : (
        <>
          <div className="table-wrapper customer-table-wrapper hidden overflow-visible rounded-xl border border-slate-200 shadow-sm lg:block">
            <div className="customer-table-scroll overflow-visible">
            <table className="table table-striped customer-table min-w-[1100px] overflow-visible">
              <thead><tr><th className="table-check"><input type="checkbox" checked={pagedRows.length > 0 && pagedRows.every((row) => selectedIds.includes(row.id))} onChange={toggleSelectPage} /></th><th>User</th><th>Role</th><th>Status</th><th>Activity</th><th>Access</th><th className="table-actions-col">Actions</th></tr></thead>
              <tbody>
                {pagedRows.map((row, rowIndex) => {
                  const shouldOpenUp = rowIndex >= pagedRows.length - 2;
                  return (
                  <tr key={row.id} className="customer-row transition-colors hover:bg-blue-50/50">
                    <td><input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleSelection(row.id)} /></td>
                    <td><div className="customer-user-cell flex items-center gap-3"><div className="customer-avatar" aria-hidden="true">{getInitial(row.username)}</div><div><div className="customer-name">{row.username}</div><div className="customer-email">{row.email}</div><div className="customer-id">ID: {row.id}</div></div></div></td>
                    <td><select className="toolbar-input customer-inline-select h-10 w-36 rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none" value={row.role} onChange={(event) => void updateRole(row.id, event.target.value as CustomerRole)} disabled={busyRoleId === row.id}><option value="ADMIN">Admin</option><option value="USER">User</option></select></td>
                    <td><div className="customer-status-pill flex items-center gap-2"><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${statusToneClass[row.status]}`}>{row.status === 'BANNED' && <span aria-label="banned">🚫</span>}{row.status}</span></div></td>
                    <td><div className="cell-strong">{row.activity.orders} orders</div><div className="cell-sub">${row.activity.spent.toFixed(2)} spent</div><div className="cell-sub">Last seen: {formatDateTime(row.activity.lastSeenAt)}</div></td>
                    <td><span className={`customer-role-chip inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${roleToneClass[row.role]}`}>{roleLabel[row.role]}</span><div className="cell-sub">Permissions: {accessLevel(row.permissions.length)}</div></td>
                    <td>
                      <div className="customer-action-shell" onClick={(event) => event.stopPropagation()}>
                        <button
                          className="button button-ghost customer-more-button"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenActionUserId((prev) => prev === row.id ? null : row.id);
                          }}
                        >
                          More
                        </button>
                        {openActionUserId === row.id && (
                          <div className={`customer-action-menu${shouldOpenUp ? ' is-up' : ''} rounded-lg border border-slate-200 bg-white shadow-xl`} role="menu" style={{ zIndex: 9999 }}>
                            <button type="button" className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2" onClick={() => runAction('edit', row)}>✏️ Edit user</button>
                            <button type="button" className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2" onClick={() => runAction('reset', row)}>🔑 Reset password</button>
                            <button type="button" className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2" onClick={() => runAction('activity', row)}>📊 View activity</button>
                            <button type="button" className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2" onClick={() => runAction('permissions', row)}>🔐 Control permissions</button>
                            <div className="border-t border-slate-200 my-1" />
                            <div className="px-2 py-1.5">
                              <p className="text-xs font-medium text-slate-500 px-2 py-1.5">Change Status</p>
                              <button type="button" className={`w-full text-left text-xs font-medium rounded px-2 py-1.5 flex items-center gap-2 transition-colors ${row.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'}`} onClick={() => void updateStatus(row.id, 'ACTIVE')} disabled={busyStatusId === row.id}>✓ Active</button>
                              <button type="button" className={`w-full text-left text-xs font-medium rounded px-2 py-1.5 flex items-center gap-2 transition-colors ${row.status === 'DISABLED' ? 'bg-amber-100 text-amber-700' : 'text-slate-600 hover:bg-slate-100'}`} onClick={() => void updateStatus(row.id, 'DISABLED')} disabled={busyStatusId === row.id}>⊘ Disabled</button>
                              <button type="button" className={`w-full text-left text-xs font-medium rounded px-2 py-1.5 flex items-center gap-2 transition-colors ${row.status === 'BANNED' ? 'bg-rose-100 text-rose-700' : 'text-slate-600 hover:bg-slate-100'}`} onClick={() => void updateStatus(row.id, 'BANNED')} disabled={busyStatusId === row.id}>🚫 Banned</button>
                            </div>
                            <div className="border-t border-slate-200 my-1" />
                            <button type="button" className="w-full text-left px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2" onClick={() => runAction('delete', row)} disabled={busyDeleteId === row.id}>{busyDeleteId === row.id ? '⏳ Deleting...' : '🗑️ Delete user'}</button>
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

          <div className="customer-mobile-list block lg:hidden">
            {pagedRows.map((row) => (
              <article key={row.id} className="customer-mobile-card rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="customer-mobile-head"><div className="customer-user-cell"><div className="customer-avatar" aria-hidden="true">{getInitial(row.username)}</div><div><div className="customer-name">{row.username}</div><div className="customer-email">{row.email}</div><div className="customer-id">ID: {row.id}</div></div></div><input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleSelection(row.id)} /></div>
                <div className="customer-mobile-grid grid gap-3 sm:grid-cols-2">
                  <label className="form-label"><span>Role</span><select className="form-input mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none" value={row.role} onChange={(event) => void updateRole(row.id, event.target.value as CustomerRole)} disabled={busyRoleId === row.id}><option value="ADMIN">Admin</option><option value="USER">User</option></select></label>
                  <div className="form-label"><span>Status</span><div className="mt-1 flex gap-1.5 flex-wrap"><button className={`px-2.5 py-1.5 rounded-full text-xs font-semibold ring-1 transition-all ${row.status === 'ACTIVE' ? statusToneClass['ACTIVE'] : 'bg-slate-100 text-slate-600 ring-slate-300 hover:bg-emerald-50'}`} onClick={() => void updateStatus(row.id, 'ACTIVE')} disabled={busyStatusId === row.id}>✓ Active</button><button className={`px-2.5 py-1.5 rounded-full text-xs font-semibold ring-1 transition-all ${row.status === 'DISABLED' ? statusToneClass['DISABLED'] : 'bg-slate-100 text-slate-600 ring-slate-300 hover:bg-amber-50'}`} onClick={() => void updateStatus(row.id, 'DISABLED')} disabled={busyStatusId === row.id}>⊘ Disabled</button><button className={`px-2.5 py-1.5 rounded-full text-xs font-semibold ring-1 transition-all ${row.status === 'BANNED' ? statusToneClass['BANNED'] : 'bg-slate-100 text-slate-600 ring-slate-300 hover:bg-rose-50'}`} onClick={() => void updateStatus(row.id, 'BANNED')} disabled={busyStatusId === row.id}>🚫 Banned</button></div></div>
                </div>
                <div className="customer-mobile-meta flex flex-wrap items-center gap-2"><span className={`customer-role-chip inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${roleToneClass[row.role]}`}>{roleLabel[row.role]}</span><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${statusToneClass[row.status]}`}>{row.status === 'BANNED' && <span aria-label="banned">🚫</span>}{row.status}</span></div>
                <div className="cell-sub">{row.activity.orders} orders • ${row.activity.spent.toFixed(2)} spent</div>
                <div className="cell-sub">Last seen: {formatDateTime(row.activity.lastSeenAt)}</div>
                <div className="customer-mobile-actions grid gap-2 sm:grid-cols-2">
                  <button className="button button-ghost rounded-full px-3 py-1.5 text-sm" type="button" onClick={() => runAction('activity', row)}>View activity</button>
                  <button className="button button-ghost rounded-full px-3 py-1.5 text-sm" type="button" onClick={() => runAction('permissions', row)}>Permissions</button>
                  <button className="button button-ghost rounded-full px-3 py-1.5 text-sm" type="button" onClick={() => runAction('edit', row)}>Edit</button>
                  <button className="button button-danger rounded-full px-3 py-1.5 text-sm" type="button" onClick={() => runAction('delete', row)}>Delete</button>
                </div>
              </article>
            ))}
          </div>

          <div className="table-pagination flex items-center justify-center gap-4 border-t border-slate-200 bg-slate-50 p-4">
            <button className="button button-ghost rounded-full px-3 py-1.5 text-sm" type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>Prev</button>
            <span className="form-hint">Page {currentPage} of {pageCount}</span>
            <button className="button button-ghost rounded-full px-3 py-1.5 text-sm" type="button" onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))} disabled={currentPage === pageCount}>Next</button>
          </div>
        </>
      )}

      {deleteTarget && (
        <div className="customer-modal-backdrop fixed inset-0 z-[90] grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm" role="presentation" onClick={() => setDeleteConfirmUserId(null)}>
          <div className="customer-modal customer-confirm-modal grid w-full max-w-xl gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h4 className="text-lg font-semibold text-slate-900">Delete user</h4>
            <p className="form-hint">This action permanently removes <strong>{deleteTarget.username}</strong>. This cannot be undone.</p>
            <div className="form-actions flex flex-wrap justify-end gap-2">
              <button className="button button-ghost rounded-full px-3 py-1.5 text-sm" type="button" onClick={() => setDeleteConfirmUserId(null)}>Cancel</button>
              <button className="button button-danger rounded-full px-3 py-1.5 text-sm" type="button" onClick={() => void deleteOne(deleteTarget)} disabled={busyDeleteId === deleteTarget.id}>{busyDeleteId === deleteTarget.id ? 'Deleting...' : 'Confirm delete'}</button>
            </div>
          </div>
        </div>
      )}

      {confirmBulkDelete && (
        <div className="customer-modal-backdrop fixed inset-0 z-[90] grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm" role="presentation" onClick={() => setConfirmBulkDelete(false)}>
          <div className="customer-modal customer-confirm-modal grid w-full max-w-xl gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h4 className="text-lg font-semibold text-slate-900">Delete selected users</h4>
            <p className="form-hint">You are deleting <strong>{selectedIds.length}</strong> selected users. This action cannot be undone.</p>
            <div className="form-actions flex flex-wrap justify-end gap-2">
              <button className="button button-ghost rounded-full px-3 py-1.5 text-sm" type="button" onClick={() => setConfirmBulkDelete(false)}>Cancel</button>
              <button className="button button-danger rounded-full px-3 py-1.5 text-sm" type="button" onClick={() => void executeBulkDelete()} disabled={isBulkDeleting}>{isBulkDeleting ? 'Deleting...' : 'Confirm bulk delete'}</button>
            </div>
          </div>
        </div>
      )}

      {editor && (
        <div className="customer-modal-backdrop fixed inset-0 z-[90] grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm" role="presentation" onClick={() => setEditor(null)}>
          <div className="customer-modal grid w-full max-w-3xl gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h4 className="text-lg font-semibold text-slate-900">{editor.mode === 'create' ? 'Create user' : 'Edit user'}</h4>
            <p className="form-hint">Set role, status, and profile details.</p>
            <div className="customer-modal-grid grid gap-3 md:grid-cols-2">
              <label className="form-label"><span>Full name</span><input className="form-input mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none" value={editor.username} onChange={(event) => setEditor((prev) => (prev ? { ...prev, username: event.target.value } : prev))} /></label>
              <label className="form-label"><span>Email</span><input className="form-input mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none" type="email" value={editor.email} onChange={(event) => setEditor((prev) => (prev ? { ...prev, email: event.target.value } : prev))} /></label>
              <label className="form-label"><span>Role</span><select className="form-input mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none" value={editor.role} onChange={(event) => setEditor((prev) => (prev ? { ...prev, role: event.target.value as CustomerRole } : prev))}><option value="ADMIN">Admin</option><option value="USER">User</option></select></label>
              <label className="form-label"><span>Status</span><select className="form-input mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none" value={editor.status} onChange={(event) => setEditor((prev) => (prev ? { ...prev, status: event.target.value as CustomerStatus } : prev))}><option value="ACTIVE">Active</option><option value="DISABLED">Disabled</option><option value="BANNED">Banned</option></select></label>
            </div>
            <div className="form-actions flex flex-wrap justify-end gap-2">
              <button className="button button-ghost rounded-full px-3 py-1.5 text-sm" type="button" onClick={() => setEditor(null)}>Cancel</button>
              <button className="button button-primary rounded-full px-3 py-1.5 text-sm" type="button" onClick={() => void saveEditor()} disabled={editor.mode === 'edit' && (busyRoleId === editor.id || busyStatusId === editor.id)}>{editor.mode === 'create' ? 'Create user' : 'Save changes'}</button>
            </div>
          </div>
        </div>
      )}

      {permissionTarget && (
        <div className="customer-modal-backdrop fixed inset-0 z-[90] grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm" role="presentation" onClick={() => setPermissionUserId(null)}>
          <div className="customer-modal grid w-full max-w-3xl gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h4 className="text-lg font-semibold text-slate-900">Permissions: {permissionTarget.username}</h4>
            <p className="form-hint">Enable or revoke individual access rules.</p>
            <div className="customer-permissions-grid grid gap-2 md:grid-cols-2">
              {(Object.keys(PERMISSION_LABELS) as PermissionKey[]).map((key) => (
                <label key={key} className="customer-permission-item flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                  <input type="checkbox" checked={permissionTarget.permissions.includes(key)} onChange={() => togglePermission(permissionTarget.id, key)} />
                  <span>{PERMISSION_LABELS[key]}</span>
                </label>
              ))}
            </div>
            <div className="form-actions flex flex-wrap justify-end gap-2"><button className="button button-primary rounded-full px-3 py-1.5 text-sm" type="button" onClick={() => setPermissionUserId(null)}>Done</button></div>
          </div>
        </div>
      )}

      {activityTarget && (
        <div className="customer-modal-backdrop fixed inset-0 z-[90] grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm" role="presentation" onClick={() => setActivityUserId(null)}>
          <div className="customer-modal grid w-full max-w-3xl gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h4 className="text-lg font-semibold text-slate-900">Activity: {activityTarget.username}</h4>
            <p className="form-hint">Recent order and account activity for monitoring.</p>
            <div className="customer-activity-grid grid gap-3 md:grid-cols-3">
              <article className="customer-activity-tile grid gap-1 rounded-md border border-slate-200 bg-slate-50 p-3"><span>Orders</span><strong>{activityTarget.activity.orders}</strong></article>
              <article className="customer-activity-tile grid gap-1 rounded-md border border-slate-200 bg-slate-50 p-3"><span>Total spend</span><strong>${activityTarget.activity.spent.toFixed(2)}</strong></article>
              <article className="customer-activity-tile grid gap-1 rounded-md border border-slate-200 bg-slate-50 p-3"><span>Last login</span><strong>{formatDateTime(activityTarget.activity.lastSeenAt)}</strong></article>
            </div>
            <div className="customer-activity-list grid gap-2">
              {activityTimeline.length === 0 ? <p className="form-hint">No recent orders.</p> : activityTimeline.map((order) => (
                <div key={order.id} className="customer-activity-item flex items-center justify-between rounded-md border border-slate-200 bg-white p-3"><div><div className="cell-strong">Order #{order.id}</div><div className="cell-sub">{formatDateTime(order.createdAt)}</div></div><div className="cell-mono">${order.total.toFixed(2)}</div></div>
              ))}
            </div>
            <div className="form-actions flex flex-wrap justify-end gap-2"><button className="button button-primary rounded-full px-3 py-1.5 text-sm" type="button" onClick={() => setActivityUserId(null)}>Close</button></div>
          </div>
        </div>
      )}
    </section>
  );
};

export default CustomerControlPanel;

