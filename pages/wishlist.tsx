import { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import Link from 'next/link';
import ProductCard from '../components/ProductCard';
import type { Product } from '../types/product';
import { getWishlistItems, removeFromWishlist } from '../utils/wishlist';
import ProtectedRoute from '../components/ProtectedRoute';

const WishlistPage: NextPage = () => {
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    const load = () => {
      setItems(getWishlistItems());
    };

    load();
    window.addEventListener('wishlistUpdated', load);
    return () => {
      window.removeEventListener('wishlistUpdated', load);
    };
  }, []);

  const handleRemove = (productId: number) => {
    removeFromWishlist(productId);
    setItems((prev) => prev.filter((item) => item.id !== productId));
  };

  return (
    <ProtectedRoute>
      <main className="layout">
        <div className="section-title">
          <div>
            <h1 className="page-title">Wishlist</h1>
            <p className="page-subtitle">Your saved items, ready whenever you are.</p>
          </div>
          <Link className="button button-ghost" href="/product/featured">
            Browse featured
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="empty-state">
            <h2>No saved items</h2>
            <p>Save products to compare or purchase later.</p>
            <Link className="button button-primary" href="/product/featured">
              Explore products
            </Link>
          </div>
        ) : (
          <section className="product-grid">
            {items.map((product) => (
              <div key={product.id} className="wishlist-card">
                <ProductCard product={product} />
                <button
                  className="button button-ghost button-sm wishlist-remove"
                  type="button"
                  onClick={() => handleRemove(product.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </section>
        )}
      </main>
    </ProtectedRoute>
  );
};

export default WishlistPage;
