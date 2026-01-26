import { useEffect, useState, useCallback } from 'react';
import { getCartItemCount } from '../utils/cart';

/**
 * Custom hook to track cart item count
 * Listens for localStorage changes to update in real-time
 */
export function useCartCount() {
  const [cartCount, setCartCount] = useState(0);

  // Update cart count
  const updateCartCount = useCallback(() => {
    const count = getCartItemCount();
    setCartCount(count);
  }, []);

  // Initialize count on mount
  useEffect(() => {
    updateCartCount();
  }, [updateCartCount]);

  // Listen for storage changes (from other tabs or windows)
  useEffect(() => {
    const handleStorageChange = () => {
      updateCartCount();
    };

    // Listen for storage changes
    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom event (for same-tab updates)
    window.addEventListener('cartUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('cartUpdated', handleStorageChange);
    };
  }, [updateCartCount]);

  return cartCount;
}
