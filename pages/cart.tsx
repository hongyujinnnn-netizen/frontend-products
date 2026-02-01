import { useState, useEffect } from 'react';
import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMessage } from '../hooks/useMessage';
import { useOrders } from '../hooks/useOrders';
import { getCartItems, removeFromCart, clearCart } from '../utils/cart';
import type { CartItem } from '../types/product';
import ProtectedRoute from '../components/ProtectedRoute';

interface CartItemWithLocal extends CartItem {
  quantity: number;
}

const CartPage: NextPage = () => {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItemWithLocal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { showMessage } = useMessage();
  const { checkout } = useOrders();

  // Load cart items on mount
  useEffect(() => {
    const items = getCartItems();
    setCartItems(items as CartItemWithLocal[]);
  }, []);

  const handleRemove = (productId: number) => {
    removeFromCart(productId);
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
    showMessage('success', 'Item removed from cart');
  };

  const handleUpdateQuantity = (productId: number, quantity: number) => {
    const item = cartItems.find((i) => i.product.id === productId);
    if (!item) return;
    const maxQuantity = item.product.stock;
    const safeQuantity = Math.min(quantity, maxQuantity);
    if (safeQuantity < 1) {
      handleRemove(productId);
      return;
    }
    if (quantity > maxQuantity) {
      showMessage('error', `Only ${maxQuantity} in stock for ${item.product.name}`);
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: safeQuantity } : item
      )
    );
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      showMessage('error', 'Cart is empty');
      return;
    }
    const outOfStockItem = cartItems.find((item) => item.quantity > item.product.stock);
    if (outOfStockItem) {
      showMessage('error', `Only ${outOfStockItem.product.stock} left for ${outOfStockItem.product.name}`);
      return;
    }
    setIsLoading(true);
    try {
      const orderItems = cartItems.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      }));
      await checkout(orderItems);
      clearCart();
      setCartItems([]);
      showMessage('success', 'Order placed successfully!');
      // Stay on cart page after checkout
    } catch (err) {
      console.error('Checkout failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const total = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <ProtectedRoute>
      <main className="layout">
        <div className="section-title">
          <div>
            <h1 className="page-title">Shopping cart</h1>
            <p className="page-subtitle">Review items before heading to checkout.</p>
          </div>
          <Link className="button button-ghost" href="/">
            Continue shopping
          </Link>
        </div>

        {cartItems.length === 0 ? (
          <div className="empty-state">
            <h2>No products yet</h2>
            <p>Looks like your bag is still empty. Add some products to see them here.</p>
            <Link className="button button-primary" href="/product/featured">
              Browse featured products
            </Link>
          </div>
        ) : (
          <div className="dashboard-grid">
            <section className="panel">
              <h3>Cart Items ({totalItems})</h3>
              <div className="list">
                {cartItems.map((item) => (
                  <div key={item.product.id} className="list-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <div>
                      <strong>{item.product.name}</strong>
                      <p className="form-hint">
                        ${item.product.price.toFixed(2)} × {item.quantity} = $
                        {(item.product.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                        className="button button-ghost"
                        style={{ padding: '4px 8px' }}
                      >
                        −
                      </button>
                      <span style={{ width: '30px', textAlign: 'center' }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                        className="button button-ghost"
                        style={{ padding: '4px 8px' }}
                      >
                        +
                      </button>
                      <button
                        onClick={() => handleRemove(item.product.id)}
                        className="button button-danger"
                        style={{ padding: '4px 8px', marginLeft: '8px' }}
                      >
                        Remove
                      </button>
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
                  <span className="stat-label">Items</span>
                  <span className="stat-value">{totalItems}</span>
                </div>
                <div className="card stat">
                  <span className="stat-label">Shipping</span>
                  <span className="stat-value">Free</span>
                </div>
                <div className="card stat" style={{ borderTop: '2px solid var(--color-border)', paddingTop: '12px' }}>
                  <span className="stat-label">Total</span>
                  <span className="stat-value" style={{ fontSize: '1.5em', color: 'var(--color-primary)' }}>
                    ${total.toFixed(2)}
                  </span>
                </div>
              </div>
              <button
                onClick={handleCheckout}
                disabled={isLoading || cartItems.length === 0}
                className="button button-primary"
                style={{ width: '100%', marginTop: '16px' }}
              >
                {isLoading ? 'Processing...' : 'Proceed to Checkout'}
              </button>
              <Link className="button button-ghost" href="/" style={{ width: '100%', marginTop: '8px', textAlign: 'center' }}>
                Continue shopping
              </Link>
            </section>
          </div>
        )}
      </main>
    </ProtectedRoute>
  );
};

export default CartPage;
