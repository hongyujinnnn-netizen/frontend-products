import type { Product } from '../types/product';
import { apiFetch } from './api';

export interface SaveProductPayload {
  name: string;
  description?: string | null;
  price: number;
  stock: number;
  imageUrl?: string | null;
  categories: string;
}

export const listProducts = () => apiFetch<Product[]>('/products');

export const getProduct = (id: number) => apiFetch<Product>(`/products/${id}`);

export const deleteProduct = (id: number) =>
  apiFetch<void>(`/products/${id}`, {
    method: 'DELETE',
  });

export const updateProduct = (id: number, payload: SaveProductPayload) =>
  apiFetch<Product>(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const createProduct = (payload: SaveProductPayload) =>
  apiFetch<Product>('/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
