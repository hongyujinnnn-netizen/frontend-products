import type { Product } from '../types/product';

const WISHLIST_KEY = 'wishlist_items';

const readWishlist = (): Product[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  const value = localStorage.getItem(WISHLIST_KEY);
  return value ? (JSON.parse(value) as Product[]) : [];
};

const writeWishlist = (items: Product[]) => {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('wishlistUpdated'));
};

export const getWishlistItems = () => readWishlist();

export const isInWishlist = (productId: number) =>
  readWishlist().some((item) => item.id === productId);

export const addToWishlist = (product: Product) => {
  const items = readWishlist();
  if (items.some((item) => item.id === product.id)) {
    return;
  }
  writeWishlist([...items, product]);
};

export const removeFromWishlist = (productId: number) => {
  const items = readWishlist().filter((item) => item.id !== productId);
  writeWishlist(items);
};

export const toggleWishlist = (product: Product) => {
  const items = readWishlist();
  if (items.some((item) => item.id === product.id)) {
    writeWishlist(items.filter((item) => item.id !== product.id));
    return false;
  }
  writeWishlist([...items, product]);
  return true;
};

export const clearWishlist = () => writeWishlist([]);
