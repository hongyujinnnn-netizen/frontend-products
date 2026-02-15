import { useEffect, useMemo, useState } from 'react';
import type { NextPage } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import ProtectedRoute from '../../components/ProtectedRoute';
import CustomerControlPanel from '../../components/admin/CustomerControlPanel';
import { useProducts } from '../../hooks/useProducts';
import { useUsers } from '../../hooks/useUsers';
import { useOrders } from '../../hooks/useOrders';
import { useMessage } from '../../hooks/useMessage';
import { productFormSchema, type ProductFormData } from '../../lib/validationSchemas';
import type { Order } from '../../types/order';

const navItems = [
  { label: 'Dashboard', icon: '📊', target: 'dashboard' },
  { label: 'Products',  icon: '📦', target: 'products' },
  { label: 'Orders',    icon: '🧾', target: 'orders' },
  { label: 'Customers', icon: '👥', target: 'customers' },
];

const orderStatusColor: Record<string, string> = {
  PENDING: 'status-warning',
  PAID: 'status-info',
  SHIPPED: 'status-purple',
  COMPLETED: 'status-success',
  CANCELLED: 'status-danger',
};

const getOrderStatus = (order: Order) => (order as { status?: string }).status ?? 'PENDING';

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
const ORDERS_PER_PAGE = 5;
const PRODUCT_CATEGORY_SUGGESTIONS = ['Electronics', 'Accessories', 'Home', 'Office', 'Gaming', 'Essentials'];
const PRODUCT_TAG_SUGGESTIONS = ['New', 'Edition', 'Discount', 'Top'];

const AdminPage: NextPage = () => {
  const { products, loading: productsLoading, loadProducts, createNewProduct, updateExistingProduct, deleteExistingProduct } = useProducts();
  const { users, loading: usersLoading, loadUsers, removeUser, changeUserRole, changeUserStatus } = useUsers();
  const { orders, isLoading: ordersLoading } = useOrders();
  const { showMessage } = useMessage();

  const [productSearch, setProductSearch] = useState('');
  const [activeNav, setActiveNav] = useState<'dashboard' | 'orders' | 'products' | 'customers'>('dashboard');
  const [productStockFilter, setProductStockFilter] = useState<'ALL' | 'LOW' | 'HEALTHY'>('ALL');
  const [productView, setProductView] = useState<'GRID' | 'TABLE'>('GRID');
  const [dismissedLowStockAlert, setDismissedLowStockAlert] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState<'ALL' | 'PENDING' | 'PAID' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [isProductSaving, setIsProductSaving] = useState(false);
  const [confirmProductId, setConfirmProductId] = useState<number | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [bulkStockValue, setBulkStockValue] = useState('');
  const [restockTarget, setRestockTarget] = useState('20');
  const [restockingProductId, setRestockingProductId] = useState<number | null>(null);
  const [isRestockingAll, setIsRestockingAll] = useState(false);
  const [isBulkWorking, setIsBulkWorking] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [productPage, setProductPage] = useState(1);
  const [orderPage, setOrderPage] = useState(1);
  const [hasAnnouncedOrders, setHasAnnouncedOrders] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [dismissedOrdersNotice, setDismissedOrdersNotice] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      description: '',
      tags: '',
      features: '',
      categories: '',
      price: '',
      stock: '',
      imageUrl: '',
    },
  });

  const pendingOrdersCount = useMemo(() => orders.filter((order) => getOrderStatus(order) === 'PENDING').length, [orders]);
  const hasOrders = orders.length > 0;
  const watchedName = watch('name');
  const watchedDescription = watch('description');
  const watchedTags = watch('tags');
  const watchedFeatures = watch('features');
  const watchedCategories = watch('categories');
  const watchedPrice = watch('price');
  const watchedStock = watch('stock');
  const watchedImageUrl = watch('imageUrl');

  useEffect(() => {
    void loadProducts();
    void loadUsers();
  }, [loadProducts, loadUsers]);

  useEffect(() => {
    setProductPage(1);
    setSelectedProductIds([]);
  }, [productSearch, productStockFilter, products.length]);

  useEffect(() => {
    setOrderPage(1);
    setSelectedOrderId(null);
  }, [orderSearch, orderFilter, orders.length]);

  useEffect(() => {
    if (!hasOrders) {
      setHasAnnouncedOrders(false);
      setDismissedOrdersNotice(false);
    }
  }, [hasOrders]);

  useEffect(() => {
    if (!hasOrders || hasAnnouncedOrders || ordersLoading) return;
    const label = pendingOrdersCount
      ? `${pendingOrdersCount} pending order${pendingOrdersCount === 1 ? '' : 's'}`
      : `${orders.length} order${orders.length === 1 ? '' : 's'}`;
    showMessage('info', `You have ${label} to review.`);
    setHasAnnouncedOrders(true);
  }, [hasOrders, hasAnnouncedOrders, ordersLoading, pendingOrdersCount, orders.length, showMessage]);

  const notifications = useMemo(() => {
    const list: { id: string; title: string; detail?: string }[] = [];
    if (hasOrders && !dismissedOrdersNotice) {
      const label = pendingOrdersCount
        ? `${pendingOrdersCount} pending order${pendingOrdersCount === 1 ? '' : 's'}`
        : `${orders.length} order${orders.length === 1 ? '' : 's'}`;
      list.push({ id: 'orders', title: 'Orders to review', detail: label });
    }
    return list;
  }, [hasOrders, dismissedOrdersNotice, pendingOrdersCount, orders.length]);

  const hasNotification = notifications.length > 0;
  const ordersBadgeCount = !dismissedOrdersNotice ? (pendingOrdersCount || orders.length) : 0;

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch = term
        ? `${product.name} ${product.description ?? ''} ${product.tags ?? ''} ${product.features ?? ''} ${product.categories ?? ''}`.toLowerCase().includes(term)
        : true;
      const isLow = product.stock <= 5;
      const matchesStock =
        productStockFilter === 'ALL' ? true : productStockFilter === 'LOW' ? isLow : !isLow;
      return matchesSearch && matchesStock;
    });
  }, [productSearch, products, productStockFilter]);
  const filteredLowStockCount = useMemo(
    () => filteredProducts.filter((product) => product.stock <= 5).length,
    [filteredProducts]
  );

  useEffect(() => {
    if (filteredLowStockCount === 0) {
      setDismissedLowStockAlert(false);
    }
  }, [filteredLowStockCount]);

  const filteredOrders = useMemo(() => {
    const term = orderSearch.trim().toLowerCase();
    return orders.filter((order) => {
      const customerLabel = getOrderCustomerLabel(order).toLowerCase();
      const customerEmail = getOrderCustomerEmail(order).toLowerCase();
      const matchesSearch = term ? `${order.id} ${customerLabel} ${customerEmail}`.includes(term) : true;
      const status = getOrderStatus(order);
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
  const parsedRestockTarget = useMemo(() => {
    const parsed = Number(restockTarget);
    if (!Number.isFinite(parsed)) return null;
    const normalized = Math.floor(parsed);
    return normalized > 0 ? normalized : null;
  }, [restockTarget]);
  const restockPlan = useMemo(() => {
    if (!parsedRestockTarget) {
      return { impactedProducts: 0, unitsToAdd: 0, estimatedCost: 0 };
    }
    return summary.lowStock.reduce(
      (acc, product) => {
        if (product.stock >= parsedRestockTarget) return acc;
        const neededUnits = parsedRestockTarget - product.stock;
        return {
          impactedProducts: acc.impactedProducts + 1,
          unitsToAdd: acc.unitsToAdd + neededUnits,
          estimatedCost: acc.estimatedCost + neededUnits * product.price,
        };
      },
      { impactedProducts: 0, unitsToAdd: 0, estimatedCost: 0 }
    );
  }, [parsedRestockTarget, summary.lowStock]);

  const revenueByDay = useMemo(() => {
    const days = 7;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const points: { date: string; label: string; total: number }[] = [];

    for (let i = days - 1; i >= 0; i -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      points.push({
        date: key,
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        total: 0,
      });
    }

    const totals = new Map(points.map((point) => [point.date, 0]));
    orders.forEach((order) => {
      const key = new Date(order.createdAt).toISOString().slice(0, 10);
      if (totals.has(key)) {
        totals.set(key, (totals.get(key) ?? 0) + order.total);
      }
    });

    return points.map((point) => ({ ...point, total: totals.get(point.date) ?? 0 }));
  }, [orders]);

  const topProducts = useMemo(() => {
    const map = new Map<number, { id: number; name: string; count: number; revenue: number }>();
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const id = item.product?.id ?? item.id;
        const name = item.product?.name ?? `Product ${id}`;
        const existing = map.get(id) ?? { id, name, count: 0, revenue: 0 };
        existing.count += item.quantity;
        existing.revenue += item.quantity * item.price;
        map.set(id, existing);
      });
    });
    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [orders]);
  const topCustomers = useMemo(() => {
    const map = new Map<string, { key: string; label: string; email: string; orders: number; spent: number; lastOrderAt: string }>();

    orders.forEach((order) => {
      const label = getOrderCustomerLabel(order);
      const email = getOrderCustomerEmail(order);
      const key = (email || label).toLowerCase();
      const existing =
        map.get(key) ?? {
          key,
          label,
          email,
          orders: 0,
          spent: 0,
          lastOrderAt: order.createdAt,
        };

      existing.orders += 1;
      existing.spent += order.total;
      if (new Date(order.createdAt).getTime() > new Date(existing.lastOrderAt).getTime()) {
        existing.lastOrderAt = order.createdAt;
      }

      map.set(key, existing);
    });

    return Array.from(map.values())
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 6);
  }, [orders]);

  const productPageCount = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const pagedProducts = filteredProducts.slice((productPage - 1) * PRODUCTS_PER_PAGE, productPage * PRODUCTS_PER_PAGE);
  const productRangeStart = filteredProducts.length === 0 ? 0 : (productPage - 1) * PRODUCTS_PER_PAGE + 1;
  const productRangeEnd = Math.min(productPage * PRODUCTS_PER_PAGE, filteredProducts.length);

  const orderPageCount = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE));
  const pagedOrders = filteredOrders.slice((orderPage - 1) * ORDERS_PER_PAGE, orderPage * ORDERS_PER_PAGE);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId]
  );

  const editingProductName = useMemo(() => {
    if (!selectedProductId) return '';
    const match = products.find((product) => product.id === selectedProductId);
    return match?.name ?? '';
  }, [products, selectedProductId]);
  const categoryTokens = useMemo(
    () => watchedCategories.split(',').map((token) => token.trim()).filter(Boolean),
    [watchedCategories]
  );
  const tagTokens = useMemo(
    () => watchedTags.split(',').map((token) => token.trim()).filter(Boolean),
    [watchedTags]
  );
  const previewPrice = useMemo(() => {
    const parsed = Number(watchedPrice);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [watchedPrice]);
  const previewStock = useMemo(() => {
    const parsed = Number(watchedStock);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }, [watchedStock]);
  const stockToneClass =
    previewStock === 0 ? 'status-danger' : previewStock <= 5 ? 'status-warning' : 'status-success';
  const stockLabel =
    previewStock === 0 ? 'Out of stock' : previewStock <= 5 ? 'Low stock' : 'Healthy stock';
  const stockProgress = Math.max(8, Math.min(100, previewStock * 8));

  const applyProductPreset = (preset: 'starter' | 'premium' | 'clearance') => {
    if (preset === 'starter') {
      setValue('name', 'Everyday Wireless Mouse', { shouldDirty: true, shouldTouch: true });
      setValue('categories', 'Electronics, Accessories', { shouldDirty: true, shouldTouch: true });
      setValue('tags', 'New, Top', { shouldDirty: true, shouldTouch: true });
      setValue('description', 'Comfortable wireless mouse designed for daily work with silent clicks.', { shouldDirty: true, shouldTouch: true });
      setValue('features', 'Silent clicks\n2.4GHz wireless\nErgonomic grip', { shouldDirty: true, shouldTouch: true });
      setValue('price', '29.90', { shouldDirty: true, shouldTouch: true });
      setValue('stock', '25', { shouldDirty: true, shouldTouch: true });
      return;
    }

    if (preset === 'premium') {
      setValue('name', 'Noise-Canceling Headphones Pro', { shouldDirty: true, shouldTouch: true });
      setValue('categories', 'Electronics, Gaming', { shouldDirty: true, shouldTouch: true });
      setValue('tags', 'Edition, Top', { shouldDirty: true, shouldTouch: true });
      setValue('description', 'Premium over-ear headphones with adaptive noise canceling and 40-hour battery.', { shouldDirty: true, shouldTouch: true });
      setValue('features', 'Adaptive ANC\n40-hour battery\nHi-res audio', { shouldDirty: true, shouldTouch: true });
      setValue('price', '249.00', { shouldDirty: true, shouldTouch: true });
      setValue('stock', '12', { shouldDirty: true, shouldTouch: true });
      return;
    }

    setValue('name', 'Last Chance Desk Lamp', { shouldDirty: true, shouldTouch: true });
    setValue('categories', 'Home, Essentials', { shouldDirty: true, shouldTouch: true });
    setValue('tags', 'Discount', { shouldDirty: true, shouldTouch: true });
    setValue('description', 'Final stock clearance for this compact desk lamp. Limited units available.', { shouldDirty: true, shouldTouch: true });
    setValue('features', 'Warm white LED\nAdjustable neck\nEnergy efficient', { shouldDirty: true, shouldTouch: true });
    setValue('price', '14.50', { shouldDirty: true, shouldTouch: true });
    setValue('stock', '4', { shouldDirty: true, shouldTouch: true });
  };

  const appendCategoryToken = (token: string) => {
    const existing = watchedCategories
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (existing.some((item) => item.toLowerCase() === token.toLowerCase())) {
      return;
    }
    const next = [...existing, token].join(', ');
    setValue('categories', next, { shouldDirty: true, shouldTouch: true });
  };

  const appendTagToken = (token: string) => {
    const existing = watchedTags
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (existing.some((item) => item.toLowerCase() === token.toLowerCase())) {
      return;
    }
    const next = [...existing, token].join(', ');
    setValue('tags', next, { shouldDirty: true, shouldTouch: true });
  };

  const handleProductSelect = (productId: number) => {
    setSelectedProductId(productId);
    const match = products.find((p) => p.id === productId);
    if (!match) return;
    reset({
      name: match.name,
      description: match.description ?? '',
      tags: match.tags ?? '',
      features: match.features ?? '',
      categories: match.categories ?? '',
      price: match.price.toString(),
      stock: match.stock.toString(),
      imageUrl: match.imageUrl ?? '',
    });
  };

  const handleProductFormReset = () => {
    setSelectedProductId(null);
    reset({ name: '', description: '', tags: '', features: '', categories: '', price: '', stock: '', imageUrl: '' });
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
          tags: data.tags || null,
          features: data.features || null,
          categories: data.categories,
          price: Number(data.price),
          stock: Number(data.stock),
          imageUrl: data.imageUrl || null,
        });
        showMessage('success', 'Product updated');
      } else {
        await createNewProduct({
          name: data.name,
          description: data.description || null,
          tags: data.tags || null,
          features: data.features || null,
          categories: data.categories,
          price: Number(data.price),
          stock: Number(data.stock),
          imageUrl: data.imageUrl || null,
        });
        showMessage('success', 'Product created');
      }
      handleProductFormReset();
    } catch {
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
    } catch {
      showMessage('error', 'Failed to delete product');
    } finally {
      setDeletingProductId(null);
      setConfirmProductId(null);
    }
  };

  const toggleProductSelection = (productId: number) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const toggleAllProducts = () => {
    const currentIds = pagedProducts.map((product) => product.id);
    const allSelected = currentIds.every((id) => selectedProductIds.includes(id));
    setSelectedProductIds((prev) => {
      if (allSelected) {
        return prev.filter((id) => !currentIds.includes(id));
      }
      const merged = new Set(prev);
      currentIds.forEach((id) => merged.add(id));
      return Array.from(merged);
    });
  };

  const handleBulkDeleteProducts = async () => {
    if (selectedProductIds.length === 0) {
      showMessage('error', 'Select products to delete.');
      return;
    }
    setIsBulkWorking(true);
    try {
      await Promise.all(selectedProductIds.map((id) => deleteExistingProduct(id)));
      showMessage('success', `Deleted ${selectedProductIds.length} products.`);
      setSelectedProductIds([]);
    } catch {
      showMessage('error', 'Bulk delete failed.');
    } finally {
      setIsBulkWorking(false);
    }
  };

  const handleBulkStockUpdate = async () => {
    const nextStock = Number(bulkStockValue);
    if (!Number.isFinite(nextStock)) {
      showMessage('error', 'Enter a valid stock number.');
      return;
    }
    if (selectedProductIds.length === 0) {
      showMessage('error', 'Select products to update.');
      return;
    }
    setIsBulkWorking(true);
    try {
      await Promise.all(
        selectedProductIds.map((id) => {
          const product = products.find((item) => item.id === id);
          if (!product) return Promise.resolve();
          return updateExistingProduct(id, {
            name: product.name,
            description: product.description ?? null,
            tags: product.tags ?? null,
            features: product.features ?? null,
            categories: product.categories ?? '',
            price: product.price,
            stock: nextStock,
            imageUrl: product.imageUrl ?? null,
          });
        })
      );
      showMessage('success', 'Stock updated.');
      setBulkStockValue('');
    } catch {
      showMessage('error', 'Bulk stock update failed.');
    } finally {
      setIsBulkWorking(false);
    }
  };

  const handleRestockSingleProduct = async (productId: number) => {
    if (!parsedRestockTarget) {
      showMessage('error', 'Set a valid restock target above 0.');
      return;
    }
    const targetProduct = products.find((product) => product.id === productId);
    if (!targetProduct) {
      showMessage('error', 'Product not found.');
      return;
    }
    if (targetProduct.stock >= parsedRestockTarget) {
      showMessage('info', `${targetProduct.name} already meets target stock.`);
      return;
    }

    setRestockingProductId(productId);
    try {
      await updateExistingProduct(productId, {
        name: targetProduct.name,
        description: targetProduct.description ?? null,
        tags: targetProduct.tags ?? null,
        features: targetProduct.features ?? null,
        categories: targetProduct.categories ?? '',
        price: targetProduct.price,
        stock: parsedRestockTarget,
        imageUrl: targetProduct.imageUrl ?? null,
      });
      showMessage('success', `${targetProduct.name} restocked to ${parsedRestockTarget}.`);
    } catch {
      showMessage('error', 'Failed to restock product.');
    } finally {
      setRestockingProductId(null);
    }
  };

  const handleRestockAllLowStock = async () => {
    if (!parsedRestockTarget) {
      showMessage('error', 'Set a valid restock target above 0.');
      return;
    }
    const candidates = summary.lowStock.filter((product) => product.stock < parsedRestockTarget);
    if (candidates.length === 0) {
      showMessage('info', 'All low-stock products already meet target.');
      return;
    }

    setIsRestockingAll(true);
    try {
      await Promise.all(
        candidates.map((product) =>
          updateExistingProduct(product.id, {
            name: product.name,
            description: product.description ?? null,
            tags: product.tags ?? null,
            features: product.features ?? null,
            categories: product.categories ?? '',
            price: product.price,
            stock: parsedRestockTarget,
            imageUrl: product.imageUrl ?? null,
          })
        )
      );
      showMessage('success', `Restocked ${candidates.length} products to ${parsedRestockTarget}.`);
    } catch {
      showMessage('error', 'Bulk restock failed.');
    } finally {
      setIsRestockingAll(false);
    }
  };

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
              <button
                type="button"
                className={`badge-dot ${hasNotification ? 'has-alert' : ''}`}
                aria-label={hasNotification ? `Notifications: ${notifications.length}` : 'No notifications'}
                onClick={() => setNotificationOpen((open) => !open)}
              >
                !
                {ordersBadgeCount > 0 && <span className="notification-count">{ordersBadgeCount}</span>}
              </button>
              {notificationOpen && (
                <div className="notification-panel" role="dialog" aria-label="Notifications">
                  <div className="notification-header">
                    <span>Notifications</span>
                    {notifications.length > 0 && (
                      <button
                        className="button button-ghost"
                        type="button"
                        onClick={() => {
                          setDismissedOrdersNotice(true);
                          setHasAnnouncedOrders(true);
                          setNotificationOpen(false);
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="notification-empty">No notifications</div>
                  ) : (
                    <ul className="notification-list">
                      {notifications.map((note) => (
                        <li key={note.id} className="notification-item">
                          <div className="notification-title">{note.title}</div>
                          {note.detail && <div className="notification-detail">{note.detail}</div>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <div className="admin-profile">
                <div className="avatar">A</div>
                <div>
                  <div className="profile-name">Admin</div>
                  <div className="profile-role">Store owner</div>
                </div>
              </div>
            </div>
          </header>

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
                      Back to store
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
                    <div className="card-foot">{ordersLoading ? 'Loading orders...' : `${salesToday.count} today`}</div>
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
                        <div className="empty-state-icon">Empty</div>
                        <h3>No orders</h3>
                        <p>Orders will show up here once placed.</p>
                      </div>
                    ) : (
                      <div className="table-wrapper">
                        <table className="table table-striped order-table">
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
                              const status = getOrderStatus(order);
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
                        <p className="form-hint">Keep shelves full with one-click restock planning.</p>
                      </div>
                      <span className="pill status-warning">{summary.lowStock.length} items</span>
                    </div>
                    <div className="restock-assistant">
                      <div className="restock-target">
                        <label className="form-label">
                          <span>Target stock per product</span>
                          <input
                            className="form-input"
                            type="number"
                            min="1"
                            step="1"
                            value={restockTarget}
                            onChange={(event) => setRestockTarget(event.target.value)}
                          />
                        </label>
                        <button
                          className="button button-primary"
                          type="button"
                          onClick={() => void handleRestockAllLowStock()}
                          disabled={isRestockingAll || !parsedRestockTarget || restockPlan.impactedProducts === 0}
                        >
                          {isRestockingAll ? 'Restocking...' : 'Restock all low stock'}
                        </button>
                      </div>
                      <div className="restock-plan-grid">
                        <div className="restock-metric">
                          <span className="restock-metric-label">Products to update</span>
                          <strong>{restockPlan.impactedProducts}</strong>
                        </div>
                        <div className="restock-metric">
                          <span className="restock-metric-label">Units to add</span>
                          <strong>{restockPlan.unitsToAdd}</strong>
                        </div>
                        <div className="restock-metric">
                          <span className="restock-metric-label">Estimated inventory cost</span>
                          <strong>${restockPlan.estimatedCost.toFixed(2)}</strong>
                        </div>
                      </div>
                    </div>
                    {lowStockShortlist.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-state-icon">Done</div>
                        <h3>All good</h3>
                        <p>Inventory looks healthy.</p>
                      </div>
                    ) : (
                      <ul className="list">
                        {lowStockShortlist.map((product) => (
                          <li key={product.id} className="list-item">
                            <div>
                              <div className="cell-strong">{product.name}</div>
                              <div className="cell-sub">
                                {product.stock} units left
                                {parsedRestockTarget && product.stock < parsedRestockTarget
                                  ? ` • Need +${parsedRestockTarget - product.stock}`
                                  : ''}
                              </div>
                            </div>
                            <div className="restock-item-actions">
                              <button className="button button-ghost" type="button" onClick={() => handleProductSelect(product.id)}>
                                Edit
                              </button>
                              <button
                                className="button button-primary"
                                type="button"
                                onClick={() => void handleRestockSingleProduct(product.id)}
                                disabled={restockingProductId === product.id || !parsedRestockTarget}
                              >
                                {restockingProductId === product.id ? 'Updating...' : 'Restock'}
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>

                  <article className="panel">
                    <div className="panel-header">
                      <div>
                        <h3>Revenue trends</h3>
                        <p className="form-hint">Last 7 days performance snapshot.</p>
                      </div>
                    </div>
                    <div className="revenue-chart">
                      {revenueByDay.map((point) => {
                        const max = Math.max(...revenueByDay.map((item) => item.total), 1);
                        const width = `${Math.round((point.total / max) * 100)}%`;
                        return (
                          <div key={point.date} className="revenue-row">
                            <span>{point.label}</span>
                            <div className="revenue-bar">
                              <span style={{ width }} />
                            </div>
                            <span className="cell-mono">${point.total.toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="top-products">
                      <h4>Top products</h4>
                      {topProducts.length === 0 ? (
                        <p className="form-hint">No order data yet.</p>
                      ) : (
                        <div className="list">
                          {topProducts.map((product) => (
                            <div key={product.id} className="list-item cart-line">
                              <div>
                                <strong>{product.name}</strong>
                                <p className="form-hint">{product.count} sold</p>
                              </div>
                              <div className="cell-mono">${product.revenue.toFixed(2)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>

                  <article className="panel">
                    <div className="panel-header">
                      <div>
                        <h3>Top customers</h3>
                        <p className="form-hint">Highest spenders ranked by lifetime order value.</p>
                      </div>
                      <button className="button button-ghost" type="button" onClick={() => setActiveNav('customers')}>
                        Open customers
                      </button>
                    </div>
                    {topCustomers.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-state-icon">Search</div>
                        <h3>No customer activity</h3>
                        <p>Customer insights appear after the first orders are placed.</p>
                      </div>
                    ) : (
                      <ul className="list customer-leaderboard">
                        {topCustomers.map((customer, index) => (
                          <li key={customer.key} className="list-item customer-leaderboard-item">
                            <div className="customer-leaderboard-main">
                              <span className="rank-chip">#{index + 1}</span>
                              <div>
                                <div className="cell-strong">{customer.label}</div>
                                <div className="cell-sub">
                                  {customer.email || `${customer.orders} order${customer.orders === 1 ? '' : 's'}`}
                                </div>
                              </div>
                            </div>
                            <div className="customer-leaderboard-metrics">
                              <div>
                                <span className="metric-label">Spent</span>
                                <strong>${customer.spent.toFixed(2)}</strong>
                              </div>
                              <div>
                                <span className="metric-label">Orders</span>
                                <strong>{customer.orders}</strong>
                              </div>
                              <div>
                                <span className="metric-label">Last order</span>
                                <strong>{new Date(customer.lastOrderAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</strong>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                </section>
              </>
            )}

            {activeNav === 'products' && (
              <section className="panel products-panel products-panel-enhanced">
                <div className="panel-header products-panel-header products-header-enhanced">
                  <div className="products-header-copy products-header-copy-enhanced">
                    <h3>Product management</h3>
                    <p className="form-hint">Manage catalog, inventory health, and publishing in one workflow.</p>
                    <div className="products-stats">
                      <div className="products-stat">
                        <span className="products-stat-label">Total products</span>
                        <span className="products-stat-value">{products.length}</span>
                      </div>
                      <div className={`products-stat ${filteredLowStockCount > 0 ? 'is-warning' : ''}`}>
                        <span className="products-stat-label">Low stock</span>
                        <span className="products-stat-value">{filteredLowStockCount}</span>
                      </div>
                      <div className="products-stat">
                        <span className="products-stat-label">Selected</span>
                        <span className="products-stat-value">{selectedProductIds.length}</span>
                      </div>
                    </div>
                  </div>
                  <div className="products-header-actions">
                    <button className="button button-primary" type="button" onClick={() => handleProductFormReset()}>
                      + Add product
                    </button>
                  </div>
                </div>
                <div className="toolbar compact products-toolbar toolbar-enhanced">
                  <div className="products-search-wrap">
                    <span className="products-search-icon" aria-hidden="true">Search</span>
                    <input
                      className="toolbar-input products-search-input"
                      placeholder="Search by product name, description, tags, or category"
                      value={productSearch}
                      onChange={(event) => setProductSearch(event.target.value)}
                    />
                  </div>
                  <select
                    className="toolbar-input"
                    value={productStockFilter}
                    onChange={(event) => setProductStockFilter(event.target.value as typeof productStockFilter)}
                  >
                    <option value="ALL">All stock</option>
                    <option value="LOW">Low Stock (&lt;= 5)</option>
                    <option value="HEALTHY">Healthy Stock</option>
                  </select>
                  <div className="view-toggle" role="tablist" aria-label="Product view mode">
                    <button type="button" className={`button button-ghost ${productView === 'GRID' ? 'is-active' : ''}`} onClick={() => setProductView('GRID')}>Grid</button>
                    <button type="button" className={`button button-ghost ${productView === 'TABLE' ? 'is-active' : ''}`} onClick={() => setProductView('TABLE')}>Table</button>
                  </div>
                </div>
                {!dismissedLowStockAlert && filteredLowStockCount > 0 && (
                  <div className="products-low-stock-alert" role="status" aria-live="polite">
                    <div>
                      <strong>{filteredLowStockCount} product(s) are low on stock.</strong>
                      <p>Set a target quantity and apply quick restock from here.</p>
                    </div>
                    <div className="products-low-stock-actions">
                      <input className="toolbar-input" type="number" min="1" step="1" value={restockTarget} onChange={(event) => setRestockTarget(event.target.value)} aria-label="Restock target" />
                      <button className="button button-primary" type="button" onClick={() => void handleRestockAllLowStock()} disabled={isRestockingAll || !parsedRestockTarget || restockPlan.impactedProducts === 0}>{isRestockingAll ? 'Restocking...' : 'Quick restock'}</button>
                      <button className="button button-ghost" type="button" onClick={() => setDismissedLowStockAlert(true)}>Dismiss</button>
                    </div>
                  </div>
                )}
                {selectedProductIds.length > 0 && (
                  <div className="bulk-actions bulk-actions-bar">
                    <span>{selectedProductIds.length} selected</span>
                    <button className="button button-ghost" type="button" onClick={toggleAllProducts}>Select page</button>
                    <button className="button button-ghost" type="button" onClick={() => setSelectedProductIds([])}>Clear all</button>
                    <div className="bulk-stock">
                      <input className="toolbar-input" placeholder="Set stock" value={bulkStockValue} onChange={(event) => setBulkStockValue(event.target.value)} />
                      <button className="button button-ghost" type="button" onClick={handleBulkStockUpdate} disabled={isBulkWorking}>{isBulkWorking ? 'Updating...' : 'Update stock'}</button>
                    </div>
                    <button className="button button-danger" type="button" onClick={handleBulkDeleteProducts} disabled={isBulkWorking}>{isBulkWorking ? 'Working...' : 'Delete selected'}</button>
                  </div>
                )}

                {productsLoading ? (
                  <div className="table-skeleton products-loading-state">
                    <div className="skeleton-row" />
                    <div className="skeleton-row" />
                    <div className="skeleton-row" />
                    <p className="form-hint">Loading product inventory...</p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="empty-state empty-state-enhanced">
                    <div className="empty-state-icon">Catalog</div>
                    <h3>{products.length === 0 ? 'No products yet' : 'No products match your filters'}</h3>
                    <p>{products.length === 0 ? 'Create your first listing to start selling.' : 'Try changing search text or stock filters.'}</p>
                    {products.length === 0 ? (
                      <button className="button button-primary" type="button" onClick={() => handleProductFormReset()}>
                        Add first product
                      </button>
                    ) : (
                      <button className="button button-ghost" type="button" onClick={() => { setProductSearch(''); setProductStockFilter('ALL'); }}>
                        Clear filters
                      </button>
                    )}
                  </div>
                ) : productView === 'GRID' ? (
                  <div className="product-grid-enhanced">
                    {pagedProducts.map((product) => {
                      const hasImage = Boolean(product.imageUrl);
                      const isSelected = selectedProductIds.includes(product.id);
                      const isLowStock = product.stock <= 5;
                      const stockTarget = Math.max(parsedRestockTarget ?? 20, 10);
                      const stockLevel = Math.min(100, Math.round((product.stock / stockTarget) * 100));
                      return (
                        <article key={product.id} className={`product-grid-card ${isSelected ? 'is-selected' : ''} ${isLowStock ? 'is-low-stock' : ''}`}>
                          <label className="product-grid-select">
                            <input type="checkbox" checked={isSelected} onChange={() => toggleProductSelection(product.id)} aria-label={`Select ${product.name}`} />
                          </label>
                          <div className="product-grid-media">
                            {hasImage ? (
                              <Image src={product.imageUrl as string} alt={product.name} width={240} height={180} sizes="(max-width: 960px) 100vw, 240px" />
                            ) : (
                              <div className="product-grid-placeholder">{(product.name ?? 'P').charAt(0).toUpperCase()}</div>
                            )}
                            <span className="product-grid-media-overlay" aria-hidden="true" />
                            <span className={`pill product-grid-stock-badge ${isLowStock ? 'status-warning' : 'status-success'}`}>{isLowStock ? 'Low stock' : 'Healthy'}</span>
                          </div>
                          <div className="product-grid-body">
                            <div className="product-grid-eyebrow">
                              <span className="product-category-badge">{product.categories || 'Uncategorized'}</span>
                              <span className="product-grid-sku">ID #{product.id}</span>
                            </div>
                            <h4>{product.name}</h4>
                            <p>{product.description ?? 'No description available.'}</p>
                            <div className="product-grid-pills">
                              {product.tags && <span className="product-category-badge">{product.tags}</span>}
                            </div>
                            <div className="product-grid-meta">
                              <strong>${product.price.toFixed(2)}</strong>
                              <span>{product.stock} units</span>
                            </div>
                            <div className="product-grid-stock-track" aria-label={`Stock level ${stockLevel}%`}>
                              <span style={{ width: `${stockLevel}%` }} />
                            </div>
                            <div className="product-grid-actions">
                              <button className="button button-ghost" type="button" onClick={() => handleProductSelect(product.id)}>Edit</button>
                              {isLowStock && (
                                <button className="button button-ghost" type="button" onClick={() => void handleRestockSingleProduct(product.id)} disabled={restockingProductId === product.id || !parsedRestockTarget}>
                                  {restockingProductId === product.id ? 'Updating...' : 'Restock'}
                                </button>
                              )}
                              <button className="button button-danger" type="button" onClick={() => setConfirmProductId(product.id)}>Delete</button>
                            </div>
                            {confirmProductId === product.id && (
                              <div className="confirm-inline">
                                <span>Delete this product?</span>
                                <button className="button button-primary" type="button" onClick={() => void handleConfirmDeleteProduct(product.id)}>Confirm</button>
                                <button className="button button-ghost" type="button" onClick={() => setConfirmProductId(null)}>Cancel</button>
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="table-wrapper product-table-shell table-modern">
                    <table className="table table-striped product-table product-table-compact">
                      <colgroup>
                        <col style={{ width: '48px' }} />
                        <col />
                        <col style={{ width: '160px' }} />
                        <col style={{ width: '120px' }} />
                        <col style={{ width: '140px' }} />
                        <col style={{ width: '210px' }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th className="table-check">
                            <input
                              type="checkbox"
                              checked={pagedProducts.length > 0 && pagedProducts.every((product) => selectedProductIds.includes(product.id))}
                              onChange={toggleAllProducts}
                              aria-label="Select all visible products"
                            />
                          </th>
                          <th>Product</th>
                          <th>Categories</th>
                          <th>Price</th>
                          <th>Stock</th>
                          <th className="table-actions-col">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedProducts.map((product) => {
                          const productInitial = (product.name ?? 'P').charAt(0).toUpperCase();
                          const hasImage = Boolean(product.imageUrl);
                          return (
                            <tr key={product.id} className={`product-row ${product.stock <= 5 ? 'is-low-stock' : ''}`}>
                              <td data-label="Select">
                                <input
                                  type="checkbox"
                                  checked={selectedProductIds.includes(product.id)}
                                  onChange={() => toggleProductSelection(product.id)}
                                  aria-label={`Select ${product.name}`}
                                />
                              </td>
                              <td data-label="Product">
                                <div className="product-cell">
                                  <div className={`product-thumb product-thumb-compact ${hasImage ? '' : 'is-placeholder'}`}>
                                    {hasImage ? (
                                      <Image
                                        src={product.imageUrl as string}
                                        alt={product.name}
                                        width={36}
                                        height={36}
                                        sizes="36px"
                                      />
                                    ) : (
                                      <span>{productInitial}</span>
                                    )}
                                  </div>
                                  <div className="product-meta">
                                    <div className="product-title">{product.name}</div>
                                    <div className="product-description">{product.description ?? 'No description'}</div>
                                    {product.tags && <div className="product-description">Tags: {product.tags}</div>}
                                  </div>
                                </div>
                              </td>
                              <td className="cell-sub" data-label="Categories">
                                <span className="product-category-badge">{product.categories || 'Uncategorized'}</span>
                              </td>
                              <td className="product-price" data-label="Price">
                                ${product.price.toFixed(2)}
                              </td>
                              <td className="cell-sub product-stock" data-label="Stock">
                                <span className={`pill ${product.stock <= 5 ? 'status-warning' : 'status-success'}`}>
                                  {product.stock <= 5 ? 'Low stock' : 'In stock'}
                                </span>
                                <span className="cell-sub">{product.stock} units</span>
                              </td>
                              <td className="cell-actions product-actions-cell" data-label="Actions">
                                <div className="product-actions-main">
                                  <button className="button button-ghost" type="button" onClick={() => handleProductSelect(product.id)}>
                                    Edit
                                  </button>
                                  <button className="button button-ghost" type="button" onClick={() => void handleRestockSingleProduct(product.id)} disabled={restockingProductId === product.id || !parsedRestockTarget || product.stock > 5}>
                                    Restock
                                  </button>
                                  <button
                                    className="button button-danger"
                                    type="button"
                                    onClick={() => setConfirmProductId(product.id)}
                                    disabled={deletingProductId === product.id}
                                  >
                                    {deletingProductId === product.id ? 'Deleting...' : 'Delete'}
                                  </button>
                                </div>
                                {confirmProductId === product.id && (
                                  <div className="confirm-inline product-confirm-inline">
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
                  </div>
                )}
                {filteredProducts.length > 0 && (
                  <div className="table-pagination pagination-enhanced">
                    <div className="pagination-summary">Showing {productRangeStart} - {productRangeEnd} of {filteredProducts.length} products</div>
                    <div className="pagination-controls">
                      <button className="button button-ghost" type="button" onClick={() => setProductPage(1)} disabled={productPage === 1}>First</button>
                      <button className="button button-ghost" type="button" onClick={() => setProductPage((page) => Math.max(1, page - 1))} disabled={productPage === 1}>Prev</button>
                      <span className="form-hint">Page {productPage} of {productPageCount}</span>
                      <button className="button button-ghost" type="button" onClick={() => setProductPage((page) => Math.min(productPageCount, page + 1))} disabled={productPage === productPageCount}>Next</button>
                      <button className="button button-ghost" type="button" onClick={() => setProductPage(productPageCount)} disabled={productPage === productPageCount}>Last</button>
                    </div>
                  </div>
                )}

                <form className="admin-form product-editor-form" onSubmit={handleSubmit(onProductSubmit)}>
                  <div className="product-editor-header">
                    <div>
                      <h4>{selectedProductId ? 'Edit product' : 'New product'}</h4>
                      <p className="form-hint">
                        {selectedProductId ? `Editing ${editingProductName}` : 'Create a polished listing with live preview.'}
                      </p>
                    </div>
                    <div className="product-editor-header-actions">
                      <button className="button button-ghost" type="button" onClick={handleProductFormReset}>
                        Reset
                      </button>
                    </div>
                  </div>

                  <div className="product-preset-row">
                    <span className="preset-label">Quick presets</span>
                    <button className="button button-ghost" type="button" onClick={() => applyProductPreset('starter')}>
                      Starter
                    </button>
                    <button className="button button-ghost" type="button" onClick={() => applyProductPreset('premium')}>
                      Premium
                    </button>
                    <button className="button button-ghost" type="button" onClick={() => applyProductPreset('clearance')}>
                      Clearance
                    </button>
                  </div>

                  <div className="product-editor-layout">
                    <div className="product-editor-fields">
                      <label className="form-label">
                        <span>Name *</span>
                        <input className="form-input" placeholder="Product name" {...register('name')} />
                        {errors.name && <span className="form-error">{errors.name.message}</span>}
                      </label>

                      <label className="form-label">
                        <span>Categories *</span>
                        <input className="form-input" placeholder="e.g. Electronics, Gadgets" {...register('categories')} />
                        <div className="chip-row">
                          {PRODUCT_CATEGORY_SUGGESTIONS.map((token) => (
                            <button
                              key={token}
                              className="chip-button"
                              type="button"
                              onClick={() => appendCategoryToken(token)}
                            >
                              + {token}
                            </button>
                          ))}
                        </div>
                        {errors.categories && <span className="form-error">{errors.categories.message}</span>}
                      </label>

                      <label className="form-label">
                        <span>Tags</span>
                        <input className="form-input" placeholder="e.g. New, Edition, Discount, Top" {...register('tags')} />
                        <div className="chip-row">
                          {PRODUCT_TAG_SUGGESTIONS.map((token) => (
                            <button
                              key={token}
                              className="chip-button"
                              type="button"
                              onClick={() => appendTagToken(token)}
                            >
                              + {token}
                            </button>
                          ))}
                        </div>
                        {errors.tags && <span className="form-error">{errors.tags.message}</span>}
                      </label>

                      <label className="form-label">
                        <span>Description</span>
                        <textarea className="form-input" rows={4} placeholder="Short description" {...register('description')} />
                        {errors.description && <span className="form-error">{errors.description.message}</span>}
                      </label>

                      <label className="form-label">
                        <span>Features</span>
                        <textarea className="form-input" rows={4} placeholder="One feature per line (optional)" {...register('features')} />
                        {errors.features && <span className="form-error">{errors.features.message}</span>}
                      </label>

                      <div className="form-grid">
                        <label className="form-label">
                          <span>Price (USD) *</span>
                          <input className="form-input" type="number" step="0.01" min="0" {...register('price')} />
                          {errors.price && <span className="form-error">{errors.price.message}</span>}
                        </label>
                        <label className="form-label">
                          <span>Stock *</span>
                          <input className="form-input" type="number" min="0" {...register('stock')} />
                          {errors.stock && <span className="form-error">{errors.stock.message}</span>}
                        </label>
                      </div>

                      <label className="form-label">
                        <span>Image URL</span>
                        <input className="form-input" placeholder="https://..." {...register('imageUrl')} />
                        {errors.imageUrl && <span className="form-error">{errors.imageUrl.message}</span>}
                      </label>
                    </div>

                    <aside className="product-editor-preview" aria-label="Product preview">
                      <div className="product-preview-card">
                        <div className={`preview-stock-pill pill ${stockToneClass}`}>{stockLabel}</div>
                        <div className="product-preview-media">
                          {watchedImageUrl?.trim() ? (
                            <div className="product-preview-image" style={{ backgroundImage: `url(${watchedImageUrl})` }} />
                          ) : (
                            <div className="product-preview-placeholder">
                              {(watchedName?.trim().charAt(0) || 'P').toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="product-preview-body">
                          <h5>{watchedName?.trim() || 'Product name preview'}</h5>
                          <p>{watchedDescription?.trim() || 'Add a short description to explain value and features.'}</p>
                          {watchedFeatures?.trim() && <p>{watchedFeatures.trim()}</p>}
                          <div className="product-preview-categories">
                            {(categoryTokens.length > 0 ? categoryTokens : ['Uncategorized']).slice(0, 3).map((token) => (
                              <span key={token} className="preview-category-chip">
                                {token}
                              </span>
                            ))}
                          </div>
                          {tagTokens.length > 0 && (
                            <div className="product-preview-categories">
                              {tagTokens.slice(0, 4).map((token) => (
                                <span key={token} className="preview-category-chip">
                                  {token}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="product-preview-meta">
                            <strong>${previewPrice.toFixed(2)}</strong>
                            <span>{previewStock} units</span>
                          </div>
                          <div className="stock-track" aria-hidden="true">
                            <span style={{ width: `${stockProgress}%` }} />
                          </div>
                        </div>
                      </div>
                    </aside>
                  </div>

                  <div className="form-actions">
                    <button className="button button-ghost" type="button" onClick={handleProductFormReset}>
                      Cancel
                    </button>
                    <button className="button button-primary" type="submit" disabled={isProductSaving}>
                      {isProductSaving ? 'Saving...' : selectedProductId ? 'Update product' : 'Create product'}
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
                    <div className="empty-state-icon">Empty</div>
                    <h3>No orders</h3>
                    <p>Orders will show up here once placed.</p>
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table className="table table-striped order-table">
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
                          const status = getOrderStatus(order);
                          const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          });
                          return (
                            <tr
                              key={order.id}
                              className={selectedOrderId === order.id ? 'row-selected' : ''}
                              onClick={() => setSelectedOrderId(order.id)}
                            >
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
                    {selectedOrder && (
                      <div className="order-detail">
                        <div className="order-detail-header">
                          <div>
                            <h4>Order #{selectedOrder.id}</h4>
                            <p className="form-hint">
                              {new Date(selectedOrder.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <span className={`pill ${orderStatusColor[getOrderStatus(selectedOrder)] ?? 'status-neutral'}`}>
                            {getOrderStatus(selectedOrder)}
                          </span>
                        </div>
                        <div className="order-detail-grid">
                          <div>
                            <div className="detail-label">Customer</div>
                            <div className="detail-value">{getOrderCustomerLabel(selectedOrder)}</div>
                            {getOrderCustomerEmail(selectedOrder) && (
                              <div className="detail-value">{getOrderCustomerEmail(selectedOrder)}</div>
                            )}
                          </div>
                          <div>
                            <div className="detail-label">Total</div>
                            <div className="detail-value">${selectedOrder.total.toFixed(2)}</div>
                          </div>
                        </div>
                        <div className="order-items">
                          {selectedOrder.items.map((item) => (
                            <div key={item.id} className="order-item">
                              <div>
                                <strong>{item.product?.name ?? `Product ${item.product?.id ?? item.id}`}</strong>
                                <div className="form-hint">
                                  {item.quantity} x ${item.price.toFixed(2)}
                                </div>
                              </div>
                              <div className="cell-mono">
                                ${(item.quantity * item.price).toFixed(2)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {activeNav === 'customers' && (
              <CustomerControlPanel
                users={users}
                orders={orders}
                loading={usersLoading}
                onDeleteUser={removeUser}
                onChangeUserRole={changeUserRole}
                onChangeUserStatus={changeUserStatus}
                notify={showMessage}
              />
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default AdminPage;

