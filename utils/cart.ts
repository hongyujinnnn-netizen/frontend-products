import type { Product, CartItem } from '../types/product';

const CART_KEY = 'cart_items';

const readCart = (): CartItem[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  const value = localStorage.getItem(CART_KEY);
  return value ? (JSON.parse(value) as CartItem[]) : [];
};

const writeCart = (items: CartItem[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(CART_KEY, JSON.stringify(items));
  
  // Emit custom event to notify subscribers
  window.dispatchEvent(new Event('cartUpdated'));
};

export const getCartItems = () => readCart();

export const addToCart = (product: Product, quantity = 1) => {
  const items = readCart();
  const existingItem = items.find((item) => item.product.id === product.id);

  const maxQuantity = product.stock;
  if (existingItem) {
    existingItem.quantity = Math.min(existingItem.quantity + quantity, maxQuantity);
  } else {
    items.push({ product, quantity: Math.min(quantity, maxQuantity) });
  }

  writeCart(items);
};

export const removeFromCart = (productId: number) => {
  const items = readCart().filter((item) => item.product.id !== productId);
  writeCart(items);
};

export const clearCart = () => writeCart([]);

export const updateCartQuantity = (productId: number, quantity: number) => {
  const items = readCart();
  const item = items.find((i) => i.product.id === productId);
  if (item) {
    const maxQuantity = item.product.stock;
    const safeQuantity = Math.min(quantity, maxQuantity);
    if (safeQuantity <= 0) {
      removeFromCart(productId);
    } else {
      item.quantity = safeQuantity;
      writeCart(items);
    }
  }
};

export const getCartTotal = (): number => {
  return readCart().reduce((sum, item) => sum + item.product.price * item.quantity, 0);
};

export const getCartItemCount = (): number => {
  return readCart().reduce((sum, item) => sum + item.quantity, 0);
};
