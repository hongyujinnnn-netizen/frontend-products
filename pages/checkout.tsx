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
        <main className="layout mx-auto max-w-6xl px-4 py-10">
          <div className="empty-state rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h2>Your cart is empty</h2>
            <p>Add some items before checking out.</p>
            <Link className="button button-primary rounded-full px-4 py-2 text-sm font-medium" href="/product/featured">
              Continue shopping
            </Link>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <main className="layout mx-auto max-w-6xl px-4 py-10">
        <div className="section-title mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Checkout</h1>
            <p className="page-subtitle">Review your order and place it.</p>
          </div>
        </div>

        <div className="checkout-steps mb-6 grid gap-3 sm:grid-cols-3">
          <div className={`checkout-step rounded-lg border px-3 py-2 text-sm font-medium ${step >= 1 ? 'is-active border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500'}`}>1. Shipping</div>
          <div className={`checkout-step rounded-lg border px-3 py-2 text-sm font-medium ${step >= 2 ? 'is-active border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500'}`}>2. Payment</div>
          <div className={`checkout-step rounded-lg border px-3 py-2 text-sm font-medium ${step >= 3 ? 'is-active border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500'}`}>3. Review</div>
        </div>

        <div className="dashboard-grid grid gap-6 lg:grid-cols-[1fr_340px]">
          <section className="panel rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3>
              {step === 1 ? 'Shipping details' : step === 2 ? 'Payment details' : 'Review order'}
            </h3>
            {step === 1 && (
              <div className="checkout-form grid gap-4">
                <div className="form-field grid gap-1">
                  <label className="form-label" htmlFor="fullName">Full name</label>
                  <input
                    id="fullName"
                    className="form-input h-10 rounded-md border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none"
                    value={shipping.fullName}
                    onChange={(event) => setShipping((prev) => ({ ...prev, fullName: event.target.value }))}
                    placeholder="Jane Appleseed"
                  />
                </div>
                <div className="form-field grid gap-1">
                  <label className="form-label" htmlFor="email">Email</label>
                  <input
                    id="email"
                    className="form-input h-10 rounded-md border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none"
                    type="email"
                    value={shipping.email}
                    onChange={(event) => setShipping((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="jane@email.com"
                  />
                </div>
                <div className="form-field grid gap-1">
                  <label className="form-label" htmlFor="address">Address</label>
                  <input
                    id="address"
                    className="form-input h-10 rounded-md border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none"
                    value={shipping.address}
                    onChange={(event) => setShipping((prev) => ({ ...prev, address: event.target.value }))}
                    placeholder="123 Market Street"
                  />
                </div>
                <div className="form-field form-duo grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="form-label" htmlFor="city">City</label>
                    <input
                      id="city"
                      className="form-input h-10 rounded-md border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none"
                      value={shipping.city}
                      onChange={(event) => setShipping((prev) => ({ ...prev, city: event.target.value }))}
                      placeholder="San Francisco"
                    />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="postal">Postal code</label>
                    <input
                      id="postal"
                      className="form-input h-10 rounded-md border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none"
                      value={shipping.postal}
                      onChange={(event) => setShipping((prev) => ({ ...prev, postal: event.target.value }))}
                      placeholder="94107"
                    />
                  </div>
                </div>
                <div className="form-field grid gap-1">
                  <label className="form-label" htmlFor="country">Country</label>
                  <input
                    id="country"
                    className="form-input h-10 rounded-md border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none"
                    value={shipping.country}
                    onChange={(event) => setShipping((prev) => ({ ...prev, country: event.target.value }))}
                    placeholder="United States"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="checkout-form grid gap-4">
                <div className="form-field grid gap-1">
                  <label className="form-label" htmlFor="cardName">Name on card</label>
                  <input
                    id="cardName"
                    className="form-input h-10 rounded-md border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none"
                    value={payment.cardName}
                    onChange={(event) => setPayment((prev) => ({ ...prev, cardName: event.target.value }))}
                    placeholder="Jane Appleseed"
                  />
                </div>
                <div className="form-field grid gap-1">
                  <label className="form-label" htmlFor="cardNumber">Card number</label>
                  <input
                    id="cardNumber"
                    className="form-input h-10 rounded-md border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none"
                    value={payment.cardNumber}
                    onChange={(event) => setPayment((prev) => ({ ...prev, cardNumber: event.target.value }))}
                    placeholder="1234 5678 9012 3456"
                  />
                </div>
                <div className="form-field form-duo grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="form-label" htmlFor="expiry">Expiry</label>
                    <input
                      id="expiry"
                      className="form-input h-10 rounded-md border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none"
                      value={payment.expiry}
                      onChange={(event) => setPayment((prev) => ({ ...prev, expiry: event.target.value }))}
                      placeholder="MM/YY"
                    />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="cvc">CVC</label>
                    <input
                      id="cvc"
                      className="form-input h-10 rounded-md border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none"
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
              <div className="checkout-review grid gap-4">
                <div className="review-block rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h4>Shipping</h4>
                  <p>{shipping.fullName}</p>
                  <p>{shipping.address}</p>
                  <p>{shipping.city} {shipping.postal}</p>
                  <p>{shipping.country}</p>
                </div>
                <div className="review-block rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h4>Order items ({itemCount})</h4>
                  <div className="list grid gap-2">
                    {cartItems.map((item) => (
                      <div key={item.product.id} className="list-item cart-line flex items-start justify-between rounded-md border border-slate-200 bg-white p-3">
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

          <section className="panel rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3>Order Summary</h3>
            <div className="metric-grid grid gap-3">
              <div className="card stat rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="stat-label">Subtotal</span>
                <span className="stat-value">${total.toFixed(2)}</span>
              </div>
              <div className="card stat rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="stat-label">Shipping</span>
                <span className="stat-value">Free</span>
              </div>
              <div className="card stat rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="stat-label">Tax</span>
                <span className="stat-value">Included</span>
              </div>
              <div className="card stat summary-total-card rounded-lg border border-blue-200 bg-blue-50 p-3">
                <span className="stat-label">Total</span>
                <span className="stat-value summary-total-value">
                  ${total.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="summary-actions mt-4 grid gap-2">
              {step > 1 && (
                <button className="button button-ghost button-block rounded-full px-3 py-2 text-sm" type="button" onClick={handlePrevStep}>
                  Back
                </button>
              )}
              {step < 3 ? (
                <button className="button button-primary button-block rounded-full px-3 py-2 text-sm" type="button" onClick={handleNextStep}>
                  Continue
                </button>
              ) : (
                <button
                  onClick={handlePlaceOrder}
                  disabled={isProcessing || cartItems.length === 0}
                  className="button button-primary button-block rounded-full px-3 py-2 text-sm"
                >
                  {isProcessing ? 'Processing...' : 'Place Order'}
                </button>
              )}
              <Link className="button button-ghost button-block rounded-full px-3 py-2 text-sm" href="/cart">
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
