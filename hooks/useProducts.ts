import { useCallback, useState } from 'react';
import type { Product } from '../types/product';
import { listProducts, createProduct, updateProduct, deleteProduct, type SaveProductPayload } from '../services/products';
import { getErrorMessage } from '../services/apiError';

/**
 * Custom hook for managing product data and operations
 * Encapsulates all product-related logic and state
 */
export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listProducts();
      setProducts(data);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createNewProduct = useCallback(
    async (payload: SaveProductPayload) => {
      setError(null);
      try {
        const newProduct = await createProduct(payload);
        setProducts((prev) => [...prev, newProduct]);
        return newProduct;
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        throw err;
      }
    },
    []
  );

  const updateExistingProduct = useCallback(
    async (id: number, payload: SaveProductPayload) => {
      setError(null);
      try {
        const updated = await updateProduct(id, payload);
        setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
        return updated;
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        throw err;
      }
    },
    []
  );

  const deleteExistingProduct = useCallback(async (id: number) => {
    setError(null);
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      throw err;
    }
  }, []);

  return {
    products,
    loading,
    error,
    loadProducts,
    createNewProduct,
    updateExistingProduct,
    deleteExistingProduct,
  };
}
