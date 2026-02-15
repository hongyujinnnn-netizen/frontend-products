import { useState, useEffect } from 'react';
import type { NextPage } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { useMessage } from '../hooks/useMessage';
import { useOrders } from '../hooks/useOrders';
import { getCartItems, removeFromCart, clearCart, updateCartQuantity } from '../utils/cart';
import type { CartItem } from '../types/product';
import ProtectedRoute from '../components/ProtectedRoute';

interface CartItemWithLocal extends CartItem {
  quantity: number;
}

const CartPage: NextPage = () => {
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
    updateCartQuantity(productId, safeQuantity);
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
  const freeShippingThreshold = 100;
  const shipping = total >= freeShippingThreshold ? 0 : 9;
  const tax = total * 0.08;
  const grandTotal = total + shipping + tax;
  const progressPercent = Math.min(100, (total / freeShippingThreshold) * 100);

  const handleClearCart = () => {
    clearCart();
    setCartItems([]);
    showMessage('success', 'Cart cleared');
  };

  const formatMoney = (value: number) => `$${value.toFixed(2)}`;

  return (
    <ProtectedRoute>
      <main className="layout">
        <section className="cart-hero">
          <div className="cart-hero-content">
            <div>
              <h1 className="page-title">Shopping cart</h1>
              <p className="page-subtitle">Review your items and checkout when you are ready.</p>
            </div>
            <div className="cart-hero-metrics">
              <span className="cart-chip">{totalItems} items</span>
              <span className="cart-chip">{formatMoney(total)} subtotal</span>
            </div>
          </div>
          <div className="cart-hero-actions">
            <Link className="button button-ghost" href="/">
              Continue shopping
            </Link>
            {cartItems.length > 0 && (
              <button className="button button-ghost" type="button" onClick={handleClearCart}>
                Clear cart
              </button>
            )}
          </div>
        </section>

        {cartItems.length === 0 ? (
          <div className="empty-state cart-empty-state">
            <div className="empty-state-icon">Cart</div>
            <h2>Your cart is empty</h2>
            <p>Add products to build your order and unlock free shipping at {formatMoney(freeShippingThreshold)}.</p>
            <div className="empty-actions">
              <Link className="button button-primary" href="/product/featured">
                Browse featured
              </Link>
              <Link className="button button-ghost" href="/">
                Back to home
              </Link>
            </div>
          </div>
        ) : (
          <div className="cart-layout">
            <section className="panel cart-items-panel">
              <div className="cart-panel-header">
                <h3>Cart items</h3>
                <span className="form-hint">{totalItems} unit{totalItems === 1 ? '' : 's'} selected</span>
              </div>

              <div className="shipping-progress-card">
                <div className="shipping-progress-header">
                  <strong>Free shipping progress</strong>
                  <span>
                    {shipping === 0
                      ? 'Unlocked'
                      : `${formatMoney(freeShippingThreshold - total)} away`}
                  </span>
                </div>
                <div className="shipping-progress-track" aria-hidden="true">
                  <span style={{ width: `${progressPercent}%` }} />
                </div>
              </div>

              <div className="list cart-lines">
                {cartItems.map((item) => (
                  <article key={item.product.id} className="cart-item-card">
                    <div className="cart-item-media">
                      {item.product.imageUrl ? (
                        <Image
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          width={96}
                          height={96}
                          sizes="96px"
                        />
                      ) : (
                        <div className="cart-item-placeholder">
                          {item.product.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="cart-item-body">
                      <div className="cart-item-main">
                        <strong className="cart-item-name">{item.product.name}</strong>
                        <span className={`pill ${item.product.stock <= 5 ? 'status-warning' : 'status-success'}`}>
                          {item.product.stock <= 5 ? `Only ${item.product.stock} left` : 'In stock'}
                        </span>
                      </div>
                      <p className="form-hint">{formatMoney(item.product.price)} each</p>

                      <div className="cart-item-actions">
                        <div className="cart-qty-controls">
                          <button
                            onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                            className="button button-ghost button-sm"
                            aria-label={`Decrease quantity for ${item.product.name}`}
                          >
                            -
                          </button>
                          <span className="cart-qty-value">{item.quantity}</span>
                          <button
                            onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                            className="button button-ghost button-sm"
                            aria-label={`Increase quantity for ${item.product.name}`}
                          >
                            +
                          </button>
                        </div>
                        <strong className="cart-line-total">{formatMoney(item.product.price * item.quantity)}</strong>
                      </div>
                    </div>
                    <div className="cart-item-side">
                      <button
                        onClick={() => handleRemove(item.product.id)}
                        className="button button-danger button-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="panel cart-summary-panel">
              <h3>Order summary</h3>
              <div className="cart-summary-breakdown">
                <div className="cart-summary-row">
                  <span>Subtotal</span>
                  <strong>{formatMoney(total)}</strong>
                </div>
                <div className="cart-summary-row">
                  <span>Shipping</span>
                  <strong>{shipping === 0 ? 'Free' : formatMoney(shipping)}</strong>
                </div>
                <div className="cart-summary-row">
                  <span>Estimated tax</span>
                  <strong>{formatMoney(tax)}</strong>
                </div>
                <div className="cart-summary-row total">
                  <span>Total</span>
                  <strong>{formatMoney(grandTotal)}</strong>
                </div>
              </div>

              <ul className="cart-benefits">
                <li>Secure checkout with protected account flow</li>
                <li>Inventory validated before order placement</li>
                <li>Fast order processing and status tracking</li>
              </ul>

              <div className="summary-actions">
                <button
                  onClick={handleCheckout}
                  disabled={isLoading || cartItems.length === 0}
                  className="button button-primary button-block"
                >
                  {isLoading ? 'Processing...' : 'Proceed to Checkout'}
                </button>
                <Link className="button button-ghost button-block" href="/">
                  Continue shopping
                </Link>
              </div>
            </section>
          </div>
        )}
      </main>
    </ProtectedRoute>
  );
};

export default CartPage;
