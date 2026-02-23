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
      <main className="layout mx-auto max-w-6xl px-4 py-10">
        <div className="section-title mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Wishlist</h1>
            <p className="page-subtitle">Your saved items, ready whenever you are.</p>
          </div>
          <Link className="button button-ghost rounded-full px-4 py-2 text-sm" href="/product/featured">
            Browse featured
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="empty-state rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h2>No saved items</h2>
            <p>Save products to compare or purchase later.</p>
            <Link className="button button-primary rounded-full px-4 py-2 text-sm font-medium" href="/product/featured">
              Explore products
            </Link>
          </div>
        ) : (
          <section className="product-grid grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((product) => (
              <div key={product.id} className="wishlist-card rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <ProductCard product={product} />
                <button
                  className="button button-ghost button-sm wishlist-remove mt-3 w-full rounded-full px-3 py-1.5 text-sm"
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
