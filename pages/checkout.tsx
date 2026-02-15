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
  const [step, setStep] = useState(1);
  const [shipping, setShipping] = useState({
    fullName: '',
    email: '',
    address: '',
    city: '',
    postal: '',
    country: '',
  });
  const [payment, setPayment] = useState({
    cardName: '',
    cardNumber: '',
    expiry: '',
    cvc: '',
  });
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

  const validateStep = () => {
    if (step === 1) {
      if (!shipping.fullName.trim() || !shipping.email.trim() || !shipping.address.trim()) {
        showMessage('error', 'Please complete your shipping details.');
        return false;
      }
    }
    if (step === 2) {
      if (!payment.cardName.trim() || !payment.cardNumber.trim() || !payment.expiry.trim()) {
        showMessage('error', 'Please complete your payment details.');
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (!validateStep()) {
      return;
    }
    setStep((prev) => Math.min(3, prev + 1));
  };

  const handlePrevStep = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

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
      await checkout(orderItems);
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

        <div className="checkout-steps">
          <div className={`checkout-step ${step >= 1 ? 'is-active' : ''}`}>1. Shipping</div>
          <div className={`checkout-step ${step >= 2 ? 'is-active' : ''}`}>2. Payment</div>
          <div className={`checkout-step ${step >= 3 ? 'is-active' : ''}`}>3. Review</div>
        </div>

        <div className="dashboard-grid">
          <section className="panel">
            <h3>
              {step === 1 ? 'Shipping details' : step === 2 ? 'Payment details' : 'Review order'}
            </h3>
            {step === 1 && (
              <div className="checkout-form">
                <div className="form-field">
                  <label className="form-label" htmlFor="fullName">Full name</label>
                  <input
                    id="fullName"
                    className="form-input"
                    value={shipping.fullName}
                    onChange={(event) => setShipping((prev) => ({ ...prev, fullName: event.target.value }))}
                    placeholder="Jane Appleseed"
                  />
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="email">Email</label>
                  <input
                    id="email"
                    className="form-input"
                    type="email"
                    value={shipping.email}
                    onChange={(event) => setShipping((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="jane@email.com"
                  />
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="address">Address</label>
                  <input
                    id="address"
                    className="form-input"
                    value={shipping.address}
                    onChange={(event) => setShipping((prev) => ({ ...prev, address: event.target.value }))}
                    placeholder="123 Market Street"
                  />
                </div>
                <div className="form-field form-duo">
                  <div>
                    <label className="form-label" htmlFor="city">City</label>
                    <input
                      id="city"
                      className="form-input"
                      value={shipping.city}
                      onChange={(event) => setShipping((prev) => ({ ...prev, city: event.target.value }))}
                      placeholder="San Francisco"
                    />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="postal">Postal code</label>
                    <input
                      id="postal"
                      className="form-input"
                      value={shipping.postal}
                      onChange={(event) => setShipping((prev) => ({ ...prev, postal: event.target.value }))}
                      placeholder="94107"
                    />
                  </div>
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="country">Country</label>
                  <input
                    id="country"
                    className="form-input"
                    value={shipping.country}
                    onChange={(event) => setShipping((prev) => ({ ...prev, country: event.target.value }))}
                    placeholder="United States"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="checkout-form">
                <div className="form-field">
                  <label className="form-label" htmlFor="cardName">Name on card</label>
                  <input
                    id="cardName"
                    className="form-input"
                    value={payment.cardName}
                    onChange={(event) => setPayment((prev) => ({ ...prev, cardName: event.target.value }))}
                    placeholder="Jane Appleseed"
                  />
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="cardNumber">Card number</label>
                  <input
                    id="cardNumber"
                    className="form-input"
                    value={payment.cardNumber}
                    onChange={(event) => setPayment((prev) => ({ ...prev, cardNumber: event.target.value }))}
                    placeholder="1234 5678 9012 3456"
                  />
                </div>
                <div className="form-field form-duo">
                  <div>
                    <label className="form-label" htmlFor="expiry">Expiry</label>
                    <input
                      id="expiry"
                      className="form-input"
                      value={payment.expiry}
                      onChange={(event) => setPayment((prev) => ({ ...prev, expiry: event.target.value }))}
                      placeholder="MM/YY"
                    />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="cvc">CVC</label>
                    <input
                      id="cvc"
                      className="form-input"
                      value={payment.cvc}
                      onChange={(event) => setPayment((prev) => ({ ...prev, cvc: event.target.value }))}
                      placeholder="123"
                    />
                  </div>
                </div>
                <p className="form-hint">Payments are disabled for MVP checkout.</p>
              </div>
            )}

            {step === 3 && (
              <div className="checkout-review">
                <div className="review-block">
                  <h4>Shipping</h4>
                  <p>{shipping.fullName}</p>
                  <p>{shipping.address}</p>
                  <p>{shipping.city} {shipping.postal}</p>
                  <p>{shipping.country}</p>
                </div>
                <div className="review-block">
                  <h4>Order items ({itemCount})</h4>
                  <div className="list">
                    {cartItems.map((item) => (
                      <div key={item.product.id} className="list-item cart-line">
                        <div>
                          <strong>{item.product.name}</strong>
                          <p className="form-hint">
                            {item.product.description && `${item.product.description.slice(0, 50)}...`}
                          </p>
                        </div>
                        <div className="cart-line-total">
                          <p className="form-hint">
                            {item.quantity} x ${item.product.price.toFixed(2)}
                          </p>
                          <strong>${(item.product.price * item.quantity).toFixed(2)}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
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
              <div className="card stat summary-total-card">
                <span className="stat-label">Total</span>
                <span className="stat-value summary-total-value">
                  ${total.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="summary-actions">
              {step > 1 && (
                <button className="button button-ghost button-block" type="button" onClick={handlePrevStep}>
                  Back
                </button>
              )}
              {step < 3 ? (
                <button className="button button-primary button-block" type="button" onClick={handleNextStep}>
                  Continue
                </button>
              ) : (
                <button
                  onClick={handlePlaceOrder}
                  disabled={isProcessing || cartItems.length === 0}
                  className="button button-primary button-block"
                >
                  {isProcessing ? 'Processing...' : 'Place Order'}
                </button>
              )}
              <Link className="button button-ghost button-block" href="/cart">
                Back to Cart
              </Link>
            </div>

            <p className="form-hint center-hint">No payment required for MVP</p>
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
};

export default CheckoutPage;
