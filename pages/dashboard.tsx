import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ProtectedRoute from '../components/ProtectedRoute';
import { useOrders } from '../hooks/useOrders';
import { useAuth } from '../context/AuthContext';

const DashboardPage: NextPage = () => {
  const router = useRouter();
  const { orders, isLoading, error } = useOrders();
  const { user, signOut } = useAuth();

  const totalSpend = orders.reduce((sum, order) => sum + (order.total ?? 0), 0);
  const latestOrder = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  const profileName = user?.username || user?.email || 'Account';

  const handleSignOut = () => {
    signOut();
    void router.push('/', undefined, { scroll: true });
  };

  return (
    <ProtectedRoute>
      <main className="layout">
        <div className="section-title">
          <div>
            <h1 className="page-title">Your dashboard</h1>
            <p className="page-subtitle">Track recent orders and quick actions in one place.</p>
          </div>
          <div className="dashboard-actions">
            <div className="profile-chip">
              <span className="profile-chip-dot" aria-hidden="true" />
              <span>{profileName}</span>
            </div>
            <button className="button button-ghost" type="button" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </div>

        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-meta">
              <div className="stat-label">Total orders</div>
              <div className="stat-value">{orders.length}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-meta">
              <div className="stat-label">Total spend</div>
              <div className="stat-value">${totalSpend.toFixed(2)}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-meta">
              <div className="stat-label">Last order</div>
              <div className="stat-value">
                {latestOrder ? new Date(latestOrder.createdAt).toLocaleDateString() : '--'}
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-grid">
          <section className="panel">
            <h3>Recent orders</h3>
            {isLoading ? (
              <div className="empty-state">
                <h2>Loading orders</h2>
                <p>Fetching your most recent activity.</p>
              </div>
            ) : error ? (
              <div className="empty-state">
                <h2>Unable to load orders</h2>
                <p>{error}</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="empty-state">
                <h2>No orders yet</h2>
                <p>Start exploring products to place your first order.</p>
              </div>
            ) : (
              <div className="list">
                {[...orders]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 6)
                  .map((order) => (
                  <div key={order.id} className="list-item cart-line">
                    <div>
                      <strong>Order #{order.id}</strong>
                      <p className="form-hint">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="cart-line-total">
                      <strong>${order.total.toFixed(2)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <h3>Quick actions</h3>
            <div className="summary-actions">
              <Link className="button button-primary button-block" href="/product/featured">
                Browse products
              </Link>
              <Link className="button button-ghost button-block" href="/cart">
                View cart
              </Link>
              <Link className="button button-ghost button-block" href="/wishlist">
                View wishlist
              </Link>
              {user?.role === 'ADMIN' && (
                <Link className="button button-ghost button-block" href="/admin">
                  Open admin
                </Link>
              )}
            </div>
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
};

export default DashboardPage;
