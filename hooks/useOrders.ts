import { useState, useCallback, useEffect } from 'react';
import useSWR from 'swr';
import type { Order } from '../types/order';
import type { OrderRequest } from '../types/api';
import { listOrders, createOrder, getRecentOrders } from '../services/orders';
import { getErrorMessage } from '../services/apiError';
import { useMessage } from './useMessage';

export function useOrders() {
  const { showMessage } = useMessage();
  const [isLoading, setIsLoading] = useState(false);

  // Fetch all orders with error handling
  const { data: orders = [], error, mutate } = useSWR<Order[]>(
    '/orders',
    async () => {
      try {
        return await listOrders();
      } catch (err) {
        // Silently fail if orders endpoint doesn't exist yet
        console.warn('Orders endpoint not available:', err);
        return [];
      }
    }
  );

  // Fetch recent orders with error handling
  const { data: recentOrders = [] } = useSWR<Order[]>(
    '/orders/recent',
    async () => {
      try {
        return await getRecentOrders(5);
      } catch (err) {
        // Silently fail if endpoint doesn't exist yet
        console.warn('Recent orders endpoint not available:', err);
        return [];
      }
    }
  );

  const checkout = useCallback(
    async (items: OrderRequest['items']) => {
      if (!items || items.length === 0) {
        showMessage('error', 'Cart is empty');
        return null;
      }

      setIsLoading(true);
      try {
        const order = await createOrder({ items });
        showMessage('success', `Order #${order.id} created successfully!`);
        await mutate(); // Refresh orders list
        return order;
      } catch (err) {
        const message = getErrorMessage(err);
        showMessage('error', message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [showMessage, mutate]
  );

  return {
    orders,
    recentOrders,
    isLoading: isLoading || !orders,
    error,
    checkout,
    mutate,
  };
}
