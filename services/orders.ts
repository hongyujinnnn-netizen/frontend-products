import type { Order } from '../types/order';
import type { OrderRequest } from '../types/api';
import { apiFetch } from './api';

/**
 * Get all orders for the current user
 */
export const listOrders = () => apiFetch<Order[]>('/orders');

/**
 * Get a specific order by ID
 */
export const getOrder = (id: number) => apiFetch<Order>(`/orders/${id}`);

/**
 * Create a new order from cart items
 */
export const createOrder = (payload: OrderRequest) =>
  apiFetch<Order>('/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

/**
 * Get recent orders (limited)
 */
export const getRecentOrders = (limit = 5) =>
  apiFetch<Order[]>(`/orders?limit=${limit}`);
