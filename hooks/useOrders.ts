import { useState, useCallback } from 'react';
import useSWR from 'swr';
import type { Order } from '../types/order';
import type { OrderRequest } from '../types/api';
import { listOrders, listAllOrders, createOrder, getRecentOrders, getRecentOrdersAll } from '../services/orders';
import { getErrorMessage } from '../services/apiError';
import { useMessage } from './useMessage';

export function useOrders() {
  const { showMessage } = useMessage();
  const [isLoading, setIsLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  // Fetch all orders with error handling
  const {
    data: ordersData,
    error,
    mutate,
    isLoading: isOrdersLoading,
  } = useSWR<Order[]>(
    '/orders/all',
    async () => {
      try {
        return await listAllOrders();
      } catch (err) {
        console.warn('Admin orders endpoint not available, falling back to user orders:', err);
        try {
          return await listOrders();
        } catch (fallbackErr) {
          const message = getErrorMessage(fallbackErr);
          setOrdersError(message);
          console.warn('Orders endpoint not available:', fallbackErr);
          return [];
        }
      }
    }
  );

  const orders = ordersData ?? [];

  // Fetch recent orders with error handling
  const { data: recentOrders = [] } = useSWR<Order[]>(
    '/orders/all/recent',
    async () => {
      try {
        return await getRecentOrdersAll(5);
      } catch (err) {
        console.warn('Admin recent orders endpoint not available, falling back to user recent orders:', err);
        try {
          return await getRecentOrders(5);
        } catch (fallbackErr) {
          console.warn('Recent orders endpoint not available:', fallbackErr);
          return [];
        }
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
        setOrdersError(null);
        return order;
      } catch (err) {
        const message = getErrorMessage(err);
        showMessage('error', message);
        setOrdersError(message);
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
    isLoading: isLoading || isOrdersLoading,
    error: error ?? ordersError,
    checkout,
    mutate,
  };
}
