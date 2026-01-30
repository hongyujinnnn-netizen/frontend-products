import { useEffect, useMemo, useState } from 'react';
import type { NextPage } from 'next';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useProducts } from '../../hooks/useProducts';
import { useUsers } from '../../hooks/useUsers';
import { useOrders } from '../../hooks/useOrders';
import { useMessage } from '../../hooks/useMessage';
import { productFormSchema, type ProductFormData } from '../../lib/validationSchemas';
import type { Order } from '../../types/order';

const navItems = [
  { label: 'Dashboard', icon: '📊', target: 'dashboard' },
  { label: 'Products', icon: '📦', target: 'products' },
  { label: 'Orders', icon: '🛒', target: 'orders' },
  { label: 'Customers', icon: '👤', target: 'customers' },
];

const orderStatusColor: Record<string, string> = {
  PENDING: 'status-warning',
  PAID: 'status-info',
  SHIPPED: 'status-purple',
  COMPLETED: 'status-success',
  CANCELLED: 'status-danger',
};

// Prefer provided username/customer name, then user.username/email (cover snake_case & camelCase variants)
const getOrderCustomerLabel = (order: Order) =>
  order.username ??
  order.customerName ??
  order.user?.username ??
  order.user_email ??
  (order as { userEmail?: string }).userEmail ??
  (order as { useremail?: string }).useremail ??
  order.user?.email ??
  order.customerEmail ??
  'Customer';

// Prefer associated user email, then customer email field if present (handle multiple casings)
const getOrderCustomerEmail = (order: Order) =>
  order.user_email ??
  (order as { userEmail?: string }).userEmail ??
  (order as { useremail?: string }).useremail ??
  order.user?.email ??
  order.customerEmail ??
  '';

const PRODUCTS_PER_PAGE = 8;
const ORDERS_PER_PAGE = 7;
const CUSTOMERS_PER_PAGE = 8;

const AdminPage: NextPage = () => {
  const { products, loading: productsLoading, loadProducts, createNewProduct, updateExistingProduct, deleteExistingProduct } = useProducts();
  const { users, loading: usersLoading, loadUsers, removeUser } = useUsers();
  const { orders, isLoading: ordersLoading } = useOrders();
  const { message, showMessage, dismiss } = useMessage();

  const [productSearch, setProductSearch] = useState('');
  const [activeNav, setActiveNav] = useState<'dashboard' | 'orders' | 'products' | 'customers'>('dashboard');
  const [productStockFilter, setProductStockFilter] = useState<'ALL' | 'LOW' | 'HEALTHY'>('ALL');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState<'ALL' | 'PENDING' | 'PAID' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [userSearch, setUserSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [isProductSaving, setIsProductSaving] = useState(false);
  const [confirmProductId, setConfirmProductId] = useState<number | null>(null);
  const [confirmUserId, setConfirmUserId] = useState<number | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [productPage, setProductPage] = useState(1);
  const [orderPage, setOrderPage] = useState(1);
  const [customerPage, setCustomerPage] = useState(1);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      description: '',
      price: '',
      stock: '',
      imageUrl: '',
    },
  });

  useEffect(() => {
    void loadProducts();
    void loadUsers();
  }, [loadProducts, loadUsers]);

  useEffect(() => {
    setProductPage(1);
  }, [productSearch, productStockFilter, products.length]);

  useEffect(() => {
    setOrderPage(1);
  }, [orderSearch, orderFilter, orders.length]);

  useEffect(() => {
    setCustomerPage(1);
  }, [userSearch, users.length]);

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch = term ? `${product.name} ${product.description ?? ''}`.toLowerCase().includes(term) : true;
      const isLow = product.stock <= 5;
      const matchesStock =
        productStockFilter === 'ALL' ? true : productStockFilter === 'LOW' ? isLow : !isLow;
      return matchesSearch && matchesStock;
    });
  }, [productSearch, products, productStockFilter]);

  const filteredUsers = useMemo(() => {
    const term = userSearch.trim().toLowerCase();
    return term ? users.filter((user) => `${user.username} ${user.email}`.toLowerCase().includes(term)) : users;
  }, [userSearch, users]);

  const filteredOrders = useMemo(() => {
    const term = orderSearch.trim().toLowerCase();
    return orders.filter((order) => {
      const customerLabel = getOrderCustomerLabel(order).toLowerCase();
      const customerEmail = getOrderCustomerEmail(order).toLowerCase();
      const matchesSearch = term ? `${order.id} ${customerLabel} ${customerEmail}`.includes(term) : true;
      const status = (order as { status?: string }).status ?? 'PENDING';
      const matchesStatus = orderFilter === 'ALL' ? true : status === orderFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, orderSearch, orderFilter]);

  const salesToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return orders
      .filter((order) => {
        const orderDate = new Date(order.createdAt);
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === today.getTime();
      })
      .reduce(
        (acc, order) => ({ count: acc.count + 1, total: acc.total + order.total }),
        { count: 0, total: 0 }
      );
  }, [orders]);

  const summary = useMemo(() => {
    const revenue = orders.reduce((sum, order) => sum + order.total, 0);
    const lowStock = products.filter((product) => product.stock <= 5);
    return {
      orders: orders.length,
      revenue,
      products: products.length,
      lowStock,
    };
  }, [orders, products]);

  const lowStockShortlist = useMemo(() => summary.lowStock.slice(0, 6), [summary.lowStock]);

  const productPageCount = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const pagedProducts = filteredProducts.slice((productPage - 1) * PRODUCTS_PER_PAGE, productPage * PRODUCTS_PER_PAGE);

  const orderPageCount = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE));
  const pagedOrders = filteredOrders.slice((orderPage - 1) * ORDERS_PER_PAGE, orderPage * ORDERS_PER_PAGE);

  const customerPageCount = Math.max(1, Math.ceil(filteredUsers.length / CUSTOMERS_PER_PAGE));
  const pagedCustomers = filteredUsers.slice((customerPage - 1) * CUSTOMERS_PER_PAGE, customerPage * CUSTOMERS_PER_PAGE);

  const editingProductName = useMemo(() => {
    if (!selectedProductId) return '';
    const match = products.find((product) => product.id === selectedProductId);
    return match?.name ?? '';
  }, [products, selectedProductId]);

  const handleProductSelect = (productId: number) => {
    setSelectedProductId(productId);
    const match = products.find((p) => p.id === productId);
    if (!match) return;
    reset({
      name: match.name,
      description: match.description ?? '',
      price: match.price.toString(),
      stock: match.stock.toString(),
      imageUrl: match.imageUrl ?? '',
    });
  };

  const handleProductFormReset = () => {
    setSelectedProductId(null);
    reset({ name: '', description: '', price: '', stock: '', imageUrl: '' });
  };

  const handleNavClick = (target: string) => {
    setActiveNav(target as typeof activeNav);
  };

  const onProductSubmit = async (data: ProductFormData) => {
    setIsProductSaving(true);
    try {
      if (selectedProductId) {
        await updateExistingProduct(selectedProductId, {
          name: data.name,
          description: data.description || null,
          price: Number(data.price),
          stock: Number(data.stock),
          imageUrl: data.imageUrl || null,
        });
        showMessage('success', 'Product updated');
      } else {
        await createNewProduct({
          name: data.name,
          description: data.description || null,
          price: Number(data.price),
          stock: Number(data.stock),
          imageUrl: data.imageUrl || null,
        });
        showMessage('success', 'Product created');
      }
      handleProductFormReset();
    } catch (error) {
      showMessage('error', 'Unable to save product');
    } finally {
      setIsProductSaving(false);
    }
  };

  const handleConfirmDeleteProduct = async (productId: number) => {
    setDeletingProductId(productId);
    try {
      await deleteExistingProduct(productId);
      showMessage('success', 'Product deleted');
      if (selectedProductId === productId) {
        handleProductFormReset();
      }
    } catch (error) {
      showMessage('error', 'Failed to delete product');
    } finally {
      setDeletingProductId(null);
      setConfirmProductId(null);
    }
  };

  const handleConfirmDeleteUser = async (userId: number) => {
    setDeletingUserId(userId);
    try {
      await removeUser(userId);
      showMessage('success', 'User removed');
    } catch (error) {
      showMessage('error', 'Unable to remove user');
    } finally {
      setDeletingUserId(null);
      setConfirmUserId(null);
    }
  };

  const recentOrders = useMemo(
    () => [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8),
    [orders]
  );

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-brand">
            <span className="brand-dot" />
            <div>
              <div className="brand-title">ShopLite Admin</div>
              <div className="brand-sub">Control center</div>
            </div>
          </div>
          <nav className="admin-nav" aria-label="Admin navigation">
            {navItems.map((item) => (
              <button
                key={item.label}
                className={`admin-nav-item ${activeNav === item.target ? 'is-active' : ''}`}
                type="button"
                onClick={() => handleNavClick(item.target)}
              >
                <span className="admin-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="admin-sidebar-footer">
            <div className="mini-card">
              <div>
                <div className="mini-label">Low stock</div>
                <div className="mini-value">{summary.lowStock.length}</div>
              </div>
              <span className="pill status-warning">Alert</span>
            </div>
            <button className="button button-ghost" type="button" onClick={() => void loadProducts()}>
              Refresh data
            </button>
          </div>
        </aside>

        <div className="admin-main">
          <header className="admin-topbar">
            <div className="admin-search">
              <input
                className="admin-search-input"
                placeholder="Search products or orders"
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
              />
              <button className="button button-ghost" type="button" onClick={() => setProductSearch('')}>
                Clear
              </button>
            </div>
            <div className="admin-topbar-actions">
              <span className="badge-dot" aria-label="Notifications">
                🔔
              </span>
              <div className="admin-profile">
                <div className="avatar">A</div>
                <div>
                  <div className="profile-name">Admin</div>
                  <div className="profile-role">Store owner</div>
                </div>
              </div>
            </div>
          </header>

          {message && (
            <div className={`status-message ${message.type === 'success' ? 'status-message-success' : 'status-message-error'}`} role="status">
              <span>{message.text}</span>
              <button className="button button-ghost" type="button" onClick={dismiss}>
                Dismiss
              </button>
            </div>
          )}

          <main className="admin-content">
            {activeNav === 'dashboard' && (
              <>
                <section className="admin-hero">
                  <div>
                    <h1 className="page-title">Admin dashboard</h1>
                    <p className="page-subtitle">Monitor sales, inventory, and customers in one place.</p>
                  </div>
                  <div className="hero-actions">
                    <Link className="button button-ghost" href="/">
                      ← Back to store
                    </Link>
                    <button className="button button-ghost" type="button" onClick={() => void loadProducts()}>
                      Sync data
                    </button>
                    <button className="button button-primary" type="button" onClick={() => handleProductFormReset()}>
                      Add product
                    </button>
                  </div>
                </section>

                <section className="admin-cards">
                  <article className="admin-card">
                    <div className="card-label">Total orders</div>
                    <div className="card-value">{summary.orders}</div>
                    <div className="card-foot">{ordersLoading ? 'Loading orders…' : `${salesToday.count} today`}</div>
                  </article>
                  <article className="admin-card">
                    <div className="card-label">Total revenue</div>
                    <div className="card-value">${summary.revenue.toFixed(2)}</div>
                    <div className="card-foot">${salesToday.total.toFixed(2)} today</div>
                  </article>
                  <article className="admin-card">
                    <div className="card-label">Products</div>
                    <div className="card-value">{summary.products}</div>
                    <div className="card-foot">{summary.lowStock.length} low stock</div>
                  </article>
                  <article className="admin-card">
                    <div className="card-label">Customers</div>
                    <div className="card-value">{users.length}</div>
                    <div className="card-foot">Active accounts</div>
                  </article>
                </section>

                <section className="admin-grid">
                  <article className="panel">
                    <div className="panel-header">
                      <div>
                        <h3>Recent orders</h3>
                        <p className="form-hint">Latest transactions with quick status.</p>
                      </div>
                      <div className="toolbar compact">
                        <input
                          className="toolbar-input"
                          placeholder="Search order ID"
                          value={orderSearch}
                          onChange={(event) => setOrderSearch(event.target.value)}
                        />
                        <select
                          className="toolbar-input"
                          value={orderFilter}
                          onChange={(event) => setOrderFilter(event.target.value as typeof orderFilter)}
                        >
                          <option value="ALL">All</option>
                          <option value="PENDING">Pending</option>
                          <option value="PAID">Paid</option>
                          <option value="SHIPPED">Shipped</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </div>
                    </div>

                    {ordersLoading ? (
                      <div className="table-skeleton">
                        <div className="skeleton-row" />
                        <div className="skeleton-row" />
                        <div className="skeleton-row" />
                      </div>
                    ) : filteredOrders.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-state-icon">📭</div>
                        <h3>No orders</h3>
                        <p>Orders will show up here once placed.</p>
                      </div>
                    ) : (
                      <div className="table-wrapper">
                        <table className="table table-striped">
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Customer</th>
                              <th>Date</th>
                              <th>Total</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pagedOrders.map((order) => {
                              const status = (order as { status?: string }).status ?? 'PENDING';
                              const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              });
                              return (
                                <tr key={order.id}>
                                  <td className="cell-mono">#{order.id}</td>
                                  <td>
                                    <div className="cell-strong">{getOrderCustomerLabel(order)}</div>
                                    <div className="cell-sub">{getOrderCustomerEmail(order) || `${order.items.length} items`}</div>
                                    {getOrderCustomerEmail(order) && <div className="cell-sub">{order.items.length} items</div>}
                                  </td>
                                  <td className="cell-sub">{orderDate}</td>
                                  <td className="cell-mono">${order.total.toFixed(2)}</td>
                                  <td>
                                    <span className={`pill ${orderStatusColor[status] ?? 'status-neutral'}`}>
                                      {status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        <div className="table-pagination">
                          <button
                            className="button button-ghost"
                            type="button"
                            onClick={() => setOrderPage((page) => Math.max(1, page - 1))}
                            disabled={orderPage === 1}
                          >
                            Prev
                          </button>
                          <span className="form-hint">
                            Page {orderPage} of {orderPageCount}
                          </span>
                          <button
                            className="button button-ghost"
                            type="button"
                            onClick={() => setOrderPage((page) => Math.min(orderPageCount, page + 1))}
                            disabled={orderPage === orderPageCount}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </article>

                  <article className="panel">
                    <div className="panel-header">
                      <div>
                        <h3>Low stock alert</h3>
                        <p className="form-hint">Keep shelves full. Restock asap.</p>
                      </div>
                      <span className="pill status-warning">{summary.lowStock.length} items</span>
                    </div>
                    {lowStockShortlist.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-state-icon">✅</div>
                        <h3>All good</h3>
                        <p>Inventory looks healthy.</p>
                      </div>
                    ) : (
                      <ul className="list">
                        {lowStockShortlist.map((product) => (
                          <li key={product.id} className="list-item">
                            <div>
                              <div className="cell-strong">{product.name}</div>
                              <div className="cell-sub">{product.stock} units left</div>
                            </div>
                            <button className="button button-ghost" type="button" onClick={() => handleProductSelect(product.id)}>
                              Restock
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                </section>
              </>
            )}

            {activeNav === 'products' && (
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Product management</h3>
                    <p className="form-hint">Search, edit, and publish products.</p>
                  </div>
                  <div className="toolbar compact">
                    <select
                      className="toolbar-input"
                      value={productStockFilter}
                      onChange={(event) => setProductStockFilter(event.target.value as typeof productStockFilter)}
                    >
                      <option value="ALL">All stock</option>
                      <option value="LOW">Low (&le;5)</option>
                      <option value="HEALTHY">Healthy</option>
                    </select>
                    <input
                      className="toolbar-input"
                      placeholder="Search products"
                      value={productSearch}
                      onChange={(event) => setProductSearch(event.target.value)}
                    />
                    <button className="button button-primary" type="button" onClick={() => handleProductFormReset()}>
                      New product
                    </button>
                  </div>
                </div>

                {productsLoading ? (
                  <div className="table-skeleton">
                    <div className="skeleton-row" />
                    <div className="skeleton-row" />
                    <div className="skeleton-row" />
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📭</div>
                    <h3>No products</h3>
                    <p>Create your first product to start selling.</p>
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table className="table table-striped product-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Price</th>
                          <th>Stock</th>
                          <th style={{ width: '200px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedProducts.map((product) => {
                          const productInitial = (product.name ?? 'P').charAt(0).toUpperCase();
                          const hasImage = Boolean(product.imageUrl);
                          return (
                            <tr key={product.id}>
                              <td>
                                <div className="product-cell">
                                  <div className={`product-thumb ${hasImage ? '' : 'is-placeholder'}`}>
                                    {hasImage ? (
                                      <img src={product.imageUrl as string} alt={product.name} loading="lazy" />
                                    ) : (
                                      <span>{productInitial}</span>
                                    )}
                                  </div>
                                  <div className="product-meta">
                                    <div className="product-title">{product.name}</div>
                                    <div className="product-description">{product.description ?? 'No description'}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="product-price">${product.price.toFixed(2)}</td>
                              <td className="cell-sub">
                                <span className={`pill ${product.stock <= 5 ? 'status-danger' : 'status-success'}`}>
                                  {product.stock <= 5 ? 'Low stock' : 'In stock'}
                                </span>
                                <span className="cell-sub">{product.stock} units</span>
                              </td>
                              <td className="cell-actions">
                                <button className="button button-ghost" type="button" onClick={() => handleProductSelect(product.id)}>
                                  ✏️ Edit
                                </button>
                                <button
                                  className="button button-danger"
                                  type="button"
                                  onClick={() => setConfirmProductId(product.id)}
                                  disabled={deletingProductId === product.id}
                                >
                                  {deletingProductId === product.id ? 'Deleting…' : 'Delete'}
                                </button>
                                {confirmProductId === product.id && (
                                  <div className="confirm-inline">
                                    <span>Confirm?</span>
                                    <button
                                      className="button button-primary"
                                      type="button"
                                      onClick={() => void handleConfirmDeleteProduct(product.id)}
                                    >
                                      Yes
                                    </button>
                                    <button className="button button-ghost" type="button" onClick={() => setConfirmProductId(null)}>
                                      Cancel
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div className="table-pagination">
                      <button
                        className="button button-ghost"
                        type="button"
                        onClick={() => setProductPage((page) => Math.max(1, page - 1))}
                        disabled={productPage === 1}
                      >
                        Prev
                      </button>
                      <span className="form-hint">
                        Page {productPage} of {productPageCount}
                      </span>
                      <button
                        className="button button-ghost"
                        type="button"
                        onClick={() => setProductPage((page) => Math.min(productPageCount, page + 1))}
                        disabled={productPage === productPageCount}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

                <form className="admin-form" onSubmit={handleSubmit(onProductSubmit)}>
                  <div className="panel-header">
                    <div>
                      <h4>{selectedProductId ? 'Edit product' : 'New product'}</h4>
                      {selectedProductId && <p className="form-hint">Editing {editingProductName}</p>}
                    </div>
                    <button className="button button-ghost" type="button" onClick={handleProductFormReset}>
                      Reset
                    </button>
                  </div>

                  <label className="form-label">
                    Name
                    <input className="form-input" placeholder="Product name" {...register('name')} />
                    {errors.name && <span className="form-error">{errors.name.message}</span>}
                  </label>

                  <label className="form-label">
                    Description
                    <textarea className="form-input" rows={3} placeholder="Short description" {...register('description')} />
                    {errors.description && <span className="form-error">{errors.description.message}</span>}
                  </label>

                  <div className="form-grid">
                    <label className="form-label">
                      Price
                      <input className="form-input" type="number" step="0.01" min="0" {...register('price')} />
                      {errors.price && <span className="form-error">{errors.price.message}</span>}
                    </label>
                    <label className="form-label">
                      Stock
                      <input className="form-input" type="number" min="0" {...register('stock')} />
                      {errors.stock && <span className="form-error">{errors.stock.message}</span>}
                    </label>
                  </div>

                  <label className="form-label">
                    Image URL
                    <input className="form-input" placeholder="https://…" {...register('imageUrl')} />
                    {errors.imageUrl && <span className="form-error">{errors.imageUrl.message}</span>}
                  </label>

                  <div className="form-actions">
                    <button className="button button-ghost" type="button" onClick={handleProductFormReset}>
                      Cancel
                    </button>
                    <button className="button button-primary" type="submit" disabled={isProductSaving}>
                      {isProductSaving ? 'Saving…' : selectedProductId ? 'Update product' : 'Create product'}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {activeNav === 'orders' && (
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Orders</h3>
                    <p className="form-hint">Search and filter by status.</p>
                  </div>
                  <div className="toolbar compact">
                    <input
                      className="toolbar-input"
                      placeholder="Search order ID"
                      value={orderSearch}
                      onChange={(event) => setOrderSearch(event.target.value)}
                    />
                    <select
                      className="toolbar-input"
                      value={orderFilter}
                      onChange={(event) => setOrderFilter(event.target.value as typeof orderFilter)}
                    >
                      <option value="ALL">All</option>
                      <option value="PENDING">Pending</option>
                      <option value="PAID">Paid</option>
                      <option value="SHIPPED">Shipped</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                </div>

                {ordersLoading ? (
                  <div className="table-skeleton">
                    <div className="skeleton-row" />
                    <div className="skeleton-row" />
                    <div className="skeleton-row" />
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📭</div>
                    <h3>No orders</h3>
                    <p>Orders will show up here once placed.</p>
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Customer</th>
                          <th>Date</th>
                          <th>Total</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedOrders.map((order) => {
                          const status = (order as { status?: string }).status ?? 'PENDING';
                          const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          });
                          return (
                            <tr key={order.id}>
                              <td className="cell-mono">#{order.id}</td>
                              <td>
                                <div className="cell-strong">{getOrderCustomerLabel(order)}</div>
                                <div className="cell-sub">{getOrderCustomerEmail(order) || `${order.items.length} items`}</div>
                                {getOrderCustomerEmail(order) && <div className="cell-sub">{order.items.length} items</div>}
                              </td>
                              <td className="cell-sub">{orderDate}</td>
                              <td className="cell-mono">${order.total.toFixed(2)}</td>
                              <td>
                                <span className={`pill ${orderStatusColor[status] ?? 'status-neutral'}`}>
                                  {status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div className="table-pagination">
                      <button
                        className="button button-ghost"
                        type="button"
                        onClick={() => setOrderPage((page) => Math.max(1, page - 1))}
                        disabled={orderPage === 1}
                      >
                        Prev
                      </button>
                      <span className="form-hint">
                        Page {orderPage} of {orderPageCount}
                      </span>
                      <button
                        className="button button-ghost"
                        type="button"
                        onClick={() => setOrderPage((page) => Math.min(orderPageCount, page + 1))}
                        disabled={orderPage === orderPageCount}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}

            {activeNav === 'customers' && (
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Customers</h3>
                    <p className="form-hint">Monitor customer accounts and status.</p>
                  </div>
                  <input
                    className="toolbar-input"
                    placeholder="Search customers"
                    value={userSearch}
                    onChange={(event) => setUserSearch(event.target.value)}
                  />
                </div>

                {usersLoading ? (
                  <div className="table-skeleton">
                    <div className="skeleton-row" />
                    <div className="skeleton-row" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">🔍</div>
                    <h3>No customers</h3>
                    <p>Invite or wait for new signups.</p>
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Status</th>
                          <th style={{ width: '160px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedCustomers.map((user) => (
                          <tr key={user.id}>
                            <td>
                              <div className="cell-strong">{user.username}</div>
                              <div className="cell-sub">ID: {user.id}</div>
                            </td>
                            <td className="cell-sub">{user.email}</td>
                            <td>
                              <span className="pill status-success">Active</span>
                            </td>
                            <td className="cell-actions">
                              <button
                                className="button button-danger"
                                type="button"
                                onClick={() => setConfirmUserId(user.id)}
                                disabled={deletingUserId === user.id}
                              >
                                {deletingUserId === user.id ? 'Removing…' : 'Remove'}
                              </button>
                              {confirmUserId === user.id && (
                                <div className="confirm-inline">
                                  <span>Confirm?</span>
                                  <button className="button button-primary" type="button" onClick={() => void handleConfirmDeleteUser(user.id)}>
                                    Yes
                                  </button>
                                  <button className="button button-ghost" type="button" onClick={() => setConfirmUserId(null)}>
                                    Cancel
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="table-pagination">
                      <button
                        className="button button-ghost"
                        type="button"
                        onClick={() => setCustomerPage((page) => Math.max(1, page - 1))}
                        disabled={customerPage === 1}
                      >
                        Prev
                      </button>
                      <span className="form-hint">Page {customerPage} of {customerPageCount}</span>
                      <button
                        className="button button-ghost"
                        type="button"
                        onClick={() => setCustomerPage((page) => Math.min(customerPageCount, page + 1))}
                        disabled={customerPage === customerPageCount}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default AdminPage;
