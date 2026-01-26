import { useEffect, useMemo, useState } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import ProtectedRoute from '../../components/ProtectedRoute';
import type { User } from '../../types/user';
import { useProducts } from '../../hooks/useProducts';
import { useUsers } from '../../hooks/useUsers';
import { useMessage } from '../../hooks/useMessage';
import { productFormSchema, type ProductFormData } from '../../lib/validationSchemas';

const AdminPage: NextPage = () => {
  const router = useRouter();
  const { products, loading: productsLoading, loadProducts, createNewProduct, updateExistingProduct, deleteExistingProduct } = useProducts();
  const { users, loading: usersLoading, loadUsers, removeUser } = useUsers();
  const { message, showMessage, dismiss } = useMessage();

  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isProductSaving, setIsProductSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      description: '',
      price: '',
      stock: '',
      imageUrl: '',
    },
  });

  const currentFormValues = watch();

  useEffect(() => {
    void loadProducts();
    void loadUsers();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    if (!term) {
      return products;
    }

    return products.filter((product) => {
      const haystack = `${product.name} ${product.description ?? ''}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [productSearch, products]);

  const handleProductSelect = (product: typeof products[0]) => {
    setSelectedProductId(product.id);
    reset({
      name: product.name,
      description: product.description ?? '',
      price: product.price.toString(),
      stock: product.stock.toString(),
      imageUrl: product.imageUrl ?? '',
    });
  };

  const handleProductFormReset = () => {
    setSelectedProductId(null);
    reset({
      name: '',
      description: '',
      price: '',
      stock: '',
      imageUrl: '',
    });
  };

  const onProductSubmit = async (data: ProductFormData) => {
    setIsProductSaving(true);
    try {
      if (selectedProductId) {
        await updateExistingProduct(selectedProductId, {
          name: data.name,
          description: data.description || null,
          price: Number(data.price),
          stock: Number(data.stock),
          imageUrl: data.imageUrl || null,
        });
        showMessage('success', 'Product updated successfully.');
      } else {
        await createNewProduct({
          name: data.name,
          description: data.description || null,
          price: Number(data.price),
          stock: Number(data.stock),
          imageUrl: data.imageUrl || null,
        });
        showMessage('success', 'Product created successfully.');
      }
      handleProductFormReset();
    } catch (error) {
      showMessage('error', 'Unable to save product.');
    } finally {
      setIsProductSaving(false);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      await deleteExistingProduct(productId);
      showMessage('success', 'Product deleted.');
    } catch (error) {
      showMessage('error', 'Failed to delete product.');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await removeUser(userId);
      showMessage('success', 'User deleted.');
      if (selectedUser?.id === userId) {
        setSelectedUser(null);
      }
    } catch (error) {
      showMessage('error', 'Unable to delete user.');
    }
  };

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <main className="layout">
        <div className="section-title">
          <div>
            <h1 className="page-title">Admin control center</h1>
            <p className="page-subtitle">
              Manage catalog inventory, oversee customer accounts, and keep operations aligned.
            </p>
          </div>
          <button className="button button-primary" type="button" onClick={handleProductFormReset}>
            New product
          </button>
        </div>

        {message && (
          <div
            className={`status-message ${
              message.type === 'success' ? 'status-message-success' : 'status-message-error'
            }`}
            role="status"
          >
            <span>{message.text}</span>
            <button className="button button-ghost" type="button" onClick={dismiss}>
              Dismiss
            </button>
          </div>
        )}

        <section className="split">
          <article className="panel">
            <div className="section-title">
              <h2>Products</h2>
              <span className="tag">{products.length} total</span>
            </div>
            <div className="toolbar">
              <input
                type="search"
                placeholder="Search products"
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
              />
              <button className="button button-ghost" type="button" onClick={() => void loadProducts()} disabled={productsLoading}>
                Refresh
              </button>
            </div>

            {productsLoading ? (
              <div className="table-empty">Loading products…</div>
            ) : filteredProducts.length === 0 ? (
              <div className="table-empty">No products match your filters.</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th style={{ width: '180px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td>{product.name}</td>
                      <td>${product.price.toFixed(2)}</td>
                      <td>{product.stock}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="button button-ghost"
                            type="button"
                            onClick={() => handleProductSelect(product)}
                          >
                            Edit
                          </button>
                          <button
                            className="button button-ghost"
                            type="button"
                            onClick={() => void handleDeleteProduct(product.id)}
                            disabled={isProductSaving}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </article>

          <article className="panel">
            <h2>{selectedProductId ? 'Edit product' : 'Create product'}</h2>
            <p className="form-hint">
              {selectedProductId
                ? 'Update the catalog entry and save your changes.'
                : 'Provide details for a new product listing.'}
            </p>
            <form className="form" onSubmit={handleSubmit(onProductSubmit)}>
              <label className="form-label" htmlFor="product-name">
                Name
                <input
                  id="product-name"
                  className={`form-input ${errors.name ? 'form-input-error' : ''}`}
                  {...register('name')}
                  required
                />
                {errors.name && <span className="form-error">{errors.name.message}</span>}
              </label>
              <label className="form-label" htmlFor="product-description">
                Description
                <textarea
                  id="product-description"
                  className={`form-input ${errors.description ? 'form-input-error' : ''}`}
                  {...register('description')}
                  rows={4}
                />
                {errors.description && <span className="form-error">{errors.description.message ?? 'Invalid description'}</span>}
              </label>
              <label className="form-label" htmlFor="product-price">
                Price
                <input
                  id="product-price"
                  className={`form-input ${errors.price ? 'form-input-error' : ''}`}
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('price')}
                  required
                />
                {errors.price && <span className="form-error">{errors.price.message}</span>}
              </label>
              <label className="form-label" htmlFor="product-stock">
                Stock
                <input
                  id="product-stock"
                  className={`form-input ${errors.stock ? 'form-input-error' : ''}`}
                  type="number"
                  min="0"
                  step="1"
                  {...register('stock')}
                  required
                />
                {errors.stock && <span className="form-error">{errors.stock.message}</span>}
              </label>
              <label className="form-label" htmlFor="product-image">
                Image URL
                <input
                  id="product-image"
                  className={`form-input ${errors.imageUrl ? 'form-input-error' : ''}`}
                  {...register('imageUrl')}
                />
                {errors.imageUrl && <span className="form-error">{errors.imageUrl.message ?? 'Invalid URL'}</span>}
              </label>
              <div className="actions">
                <button
                  className="button button-primary"
                  type="submit"
                  disabled={isProductSaving}
                >
                  {isProductSaving ? 'Saving…' : selectedProductId ? 'Save changes' : 'Create product'}
                </button>
                {selectedProductId && (
                  <button
                    className="button button-ghost"
                    type="button"
                    onClick={handleProductFormReset}
                    disabled={isProductSaving}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </article>
        </section>

        <section className="split">
          <article className="panel">
            <div className="section-title">
              <h2>Users</h2>
              <span className="tag">{users.length} registered</span>
            </div>

            {usersLoading ? (
              <div className="table-empty">Loading users…</div>
            ) : users.length === 0 ? (
              <div className="table-empty">No users found.</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th style={{ width: '160px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.username}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`tag ${user.role === 'ADMIN' ? 'tag-admin' : 'tag-user'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="button button-ghost"
                            type="button"
                            onClick={() => setSelectedUser(user)}
                          >
                            View
                          </button>
                          <button
                            className="button button-ghost"
                            type="button"
                            onClick={() => void handleDeleteUser(user.id)}
                            disabled={isProductSaving}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </article>

          <article className="panel">
            <h2>User details</h2>
            {selectedUser ? (
              <div className="user-details">
                <strong>{selectedUser.username}</strong>
                <span>Email: {selectedUser.email}</span>
                <span>Role: {selectedUser.role}</span>
                <span>User ID: {selectedUser.id}</span>
              </div>
            ) : (
              <div className="table-empty">Select a user to inspect details.</div>
            )}
          </article>
        </section>
      </main>
    </ProtectedRoute>
  );
};

export default AdminPage;
