import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import type { Product } from '../types/product';
import { listProducts, createProduct, updateProduct, deleteProduct, type SaveProductPayload } from '../services/products';
import { getErrorMessage } from '../services/apiError';

/**
 * Custom hook for managing product data and operations
 * Encapsulates all product-related logic and state
 */
export function useProducts() {
  const [isMutating, setIsMutating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data,
    error: fetchError,
    isLoading,
    mutate,
  } = useSWR<Product[]>('/products', async () => listProducts());

  const products = useMemo(() => data ?? [], [data]);
  const error = useMemo(() => {
    if (fetchError) {
      return getErrorMessage(fetchError);
    }
    return actionError;
  }, [fetchError, actionError]);

  const loadProducts = useCallback(async () => {
    await mutate();
  }, [mutate]);

  const createNewProduct = useCallback(
    async (payload: SaveProductPayload) => {
      setActionError(null);
      setIsMutating(true);
      try {
        const newProduct = await createProduct(payload);
        await mutate((current = []) => [...current, newProduct], { revalidate: false });
        return newProduct;
      } catch (err) {
        const message = getErrorMessage(err);
        setActionError(message);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [mutate]
  );

  const updateExistingProduct = useCallback(
    async (id: number, payload: SaveProductPayload) => {
      setActionError(null);
      setIsMutating(true);
      try {
        const updated = await updateProduct(id, payload);
        await mutate(
          (current = []) => current.map((p) => (p.id === id ? updated : p)),
          { revalidate: false }
        );
        return updated;
      } catch (err) {
        const message = getErrorMessage(err);
        setActionError(message);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [mutate]
  );

  const deleteExistingProduct = useCallback(async (id: number) => {
    setActionError(null);
    setIsMutating(true);
    try {
      await deleteProduct(id);
      await mutate((current = []) => current.filter((p) => p.id !== id), {
        revalidate: false,
      });
    } catch (err) {
      const message = getErrorMessage(err);
      setActionError(message);
      throw err;
    } finally {
      setIsMutating(false);
    }
  }, [mutate]);

  return {
    products,
    loading: isLoading || isMutating,
    error,
    loadProducts,
    createNewProduct,
    updateExistingProduct,
    deleteExistingProduct,
  };
}
