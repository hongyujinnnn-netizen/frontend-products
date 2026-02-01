import { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMessage } from '../hooks/useMessage';
import { useOrders } from '../hooks/useOrders';
import { getCartItems, clearCart } from '../utils/cart';
import type { CartItem } from '../types/product';
import ProtectedRoute from '../components/ProtectedRoute';

const CheckoutPage: NextPage = () => {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { showMessage } = useMessage();
  const { checkout } = useOrders();

  // Load cart on mount
  useEffect(() => {
    const items = getCartItems();
    setCartItems(items);
  }, []);

  const total = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

      // ...existing code...
  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      showMessage('error', 'Cart is empty');
      return;
    }
    const outOfStockItem = cartItems.find((item) => item.quantity > item.product.stock);
    if (outOfStockItem) {
      showMessage('error', `Only ${outOfStockItem.product.stock} left for ${outOfStockItem.product.name}`);
      return;
    }
    setIsProcessing(true);
    try {
      // Transform cart items to order request format
      const orderItems = cartItems.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      }));
      // Create order
      const order = await checkout(orderItems);
      clearCart();
      router.replace('/cart').catch((err) => console.error('Redirect failed:', err));
    } catch (error) {
      console.error('Checkout error:', error);
      showMessage('error', 'Failed to place order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (cartItems.length === 0 && !isProcessing) {
    return (
      <ProtectedRoute>
        <main className="layout">
          <div className="empty-state">
            <h2>Your cart is empty</h2>
            <p>Add some items before checking out.</p>
            <Link className="button button-primary" href="/product/featured">
              Continue shopping
            </Link>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <main className="layout">
        <div className="section-title">
          <div>
            <h1 className="page-title">Checkout</h1>
            <p className="page-subtitle">Review your order and place it.</p>
          </div>
        </div>

        <div className="dashboard-grid">
          <section className="panel">
            <h3>Order Items ({itemCount})</h3>
            <div className="list">
              {cartItems.map((item) => (
                <div
                  key={item.product.id}
                  className="list-item"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 0',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  <div>
                    <strong>{item.product.name}</strong>
                    <p className="form-hint">
                      {item.product.description && `${item.product.description.slice(0, 50)}...`}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p className="form-hint">
                      {item.quantity} × ${item.product.price.toFixed(2)}
                    </p>
                    <strong>${(item.product.price * item.quantity).toFixed(2)}</strong>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <h3>Order Summary</h3>
            <div className="metric-grid">
              <div className="card stat">
                <span className="stat-label">Subtotal</span>
                <span className="stat-value">${total.toFixed(2)}</span>
              </div>
              <div className="card stat">
                <span className="stat-label">Shipping</span>
                <span className="stat-value">Free</span>
              </div>
              <div className="card stat">
                <span className="stat-label">Tax</span>
                <span className="stat-value">Included</span>
              </div>
              <div
                className="card stat"
                style={{
                  borderTop: '2px solid var(--color-border)',
                  paddingTop: '12px',
                }}
              >
                <span className="stat-label">Total</span>
                <span
                  className="stat-value"
                  style={{
                    fontSize: '1.5em',
                    color: 'var(--color-primary)',
                  }}
                >
                  ${total.toFixed(2)}
                </span>
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <button
                onClick={handlePlaceOrder}
                disabled={isProcessing || cartItems.length === 0}
                className="button button-primary"
                style={{ width: '100%', marginBottom: '8px' }}
              >
                {isProcessing ? 'Processing...' : 'Place Order'}
              </button>
              <Link
                className="button button-ghost"
                href="/cart"
                style={{ width: '100%', textAlign: 'center' }}
              >
                Back to Cart
              </Link>
            </div>

            <p className="form-hint" style={{ marginTop: '16px', textAlign: 'center' }}>
              ✅ No payment required for MVP
            </p>
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
};

export default CheckoutPage;
