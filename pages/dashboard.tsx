import { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import Link from 'next/link';
import ProtectedRoute from '../components/ProtectedRoute';
import { useOrders } from '../hooks/useOrders';
import { listProducts } from '../services/products';
import type { Order } from '../types/order';
import type { Product } from '../types/product';

const DashboardPage: NextPage = () => {
  const { orders, isLoading: ordersLoading } = useOrders();
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [stats, setStats] = useState({
    ordersToday: 0,
    totalRevenue: 0,
    totalOrders: 0,
    lowInventoryCount: 0,
  });

  // Fetch all products to calculate low inventory
  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      setProductsLoading(true);
      try {
        const data = await listProducts();
        if (isMounted) {
          setProducts(data);
        }
      } catch (error) {
        console.error('Failed to load products:', error);
      } finally {
        if (isMounted) {
          setProductsLoading(false);
        }
      }
    };

    void loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  // Calculate stats from all orders and products
  useEffect(() => {
    if (orders.length > 0 || products.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Orders today
      const ordersToday = orders.filter((order) => {
        const orderDate = new Date(order.createdAt);
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === today.getTime();
      }).length;

      // Total revenue
      const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

      // Low inventory (stock < 4)
      const lowInventoryCount = products.filter((product) => product.stock < 4 && product.stock > 0).length;

      setStats({
        ordersToday,
        totalRevenue,
        totalOrders: orders.length,
        lowInventoryCount,
      });
    }
  }, [orders, products]);

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;
  const getItemCount = (order: Order) => order.items.reduce((sum, item) => sum + item.quantity, 0);
  
  // Get recent orders (last 5)
  const recentOrders = orders.slice(0, 5);

  const isLoading = ordersLoading || productsLoading;

  return (
    <ProtectedRoute>
      <main className="layout">
        <div className="section-title">
          <div>
            <h1 className="page-title">Merchant dashboard</h1>
            <p className="page-subtitle">
              Monitor orders, fulfillment velocity, and catalog health at a glance.
            </p>
          </div>
          <Link className="button button-primary" href="/admin">
            Add new product
          </Link>
        </div>

        <section className="metric-grid">
          <div className="card stat">
            <span className="stat-label">Orders today</span>
            <span className="stat-value">{stats.ordersToday}</span>
            <p className="form-hint">
              {stats.ordersToday > 0 ? `${stats.ordersToday} order${stats.ordersToday !== 1 ? 's' : ''} completed` : 'No orders yet today'}
            </p>
          </div>
          <div className="card stat">
            <span className="stat-label">Total revenue</span>
            <span className="stat-value">{formatPrice(stats.totalRevenue)}</span>
            <p className="form-hint">From {stats.totalOrders} order{stats.totalOrders !== 1 ? 's' : ''}</p>
          </div>
          <div className="card stat">
            <span className="stat-label">Low inventory</span>
            <span className="stat-value">{stats.lowInventoryCount}</span>
            <p className="form-hint">Products with stock &lt; 4 units</p>
          </div>
        </section>

        <section className="dashboard-grid">
          <article className="panel">
            <h3>Recent orders</h3>
            <p className="form-hint">
              {isLoading
                ? 'Loading orders...'
                : recentOrders.length > 0
                  ? `The last ${recentOrders.length} orders placed on your storefront.`
                  : 'No orders yet. Start promoting your products!'}
            </p>
            {isLoading ? (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <p>Loading orders from API...</p>
              </div>
            ) : recentOrders.length > 0 ? (
              <ul className="list">
                {recentOrders.map((order) => {
                  const orderDate = new Date(order.createdAt);
                  const dateStr = orderDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  
                  return (
                    <li key={order.id} className="list-item">
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <strong>Order #{order.id}</strong>
                        <span className="form-hint">{dateStr}</span>
                      </div>
                      <span className="form-hint">
                        {formatPrice(order.total)} · {getItemCount(order)} item
                        {getItemCount(order) !== 1 ? 's' : ''}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="empty-state" style={{ padding: '20px', textAlign: 'center' }}>
                <p>No orders yet</p>
                <p className="form-hint">Orders will appear here as customers purchase</p>
              </div>
            )}
            <Link className="button button-ghost" href="/dashboard">
              View all orders
            </Link>
          </article>

          <article className="panel">
            <h3>Performance metrics</h3>
            <p className="form-hint">Track your store's health and growth.</p>
            <div className="metric-grid">
              <div className="card stat">
                <span className="stat-label">Total orders</span>
                <span className="stat-value">{stats.totalOrders}</span>
                <p className="form-hint">All time orders</p>
              </div>
              <div className="card stat">
                <span className="stat-label">Avg order value</span>
                <span className="stat-value">
                  {stats.totalOrders > 0 ? formatPrice(stats.totalRevenue / stats.totalOrders) : '$0.00'}
                </span>
                <p className="form-hint">Revenue per order</p>
              </div>
            </div>
          </article>
        </section>
      </main>
    </ProtectedRoute>
  );
};

export default DashboardPage;
