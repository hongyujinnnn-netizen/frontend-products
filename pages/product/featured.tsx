import { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import ProductCard from '../../components/ProductCard';
import type { Product } from '../../types/product';
import { listProducts } from '../../services/products';
import { useAuth } from '../../context/AuthContext';

const fallbackFeatured: Product[] = [
  {
    id: 101,
    name: 'Lumen Desk Bundle',
    description: 'A curated workstation bundle designed for productive hybrid teams.',
    price: 129.0,
    stock: 8,
    imageUrl: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=600&h=400&fit=crop',
  },
  {
    id: 102,
    name: 'Arcade Creator Kit',
    description: 'Premium audio, lighting, and capture tools for content launches.',
    price: 189.0,
    stock: 5,
    imageUrl: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&h=400&fit=crop',
  },
  {
    id: 103,
    name: 'Fieldnote Explorer Pack',
    description: 'Outdoor-ready gear made for on-location shoots and pop-ups.',
    price: 159.0,
    stock: 12,
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop',
  },
  {
    id: 104,
    name: 'Northwind Studio Set',
    description: 'Modular pieces for teams that swap displays, stands, and props often.',
    price: 98.0,
    stock: 10,
    imageUrl: 'https://images.unsplash.com/photo-1593642632781-0c887a0a3b3f?w=600&h=400&fit=crop',
  },
  {
    id: 105,
    name: 'Brightside Hospitality Duo',
    description: 'Guest-ready welcome kit pairing textile goods with smart accessories.',
    price: 76.0,
    stock: 20,
    imageUrl: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=600&h=400&fit=crop',
  },
];

const FeaturedProductsPage: NextPage = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>(fallbackFeatured);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const itemsPerPage = 6;
  const totalPages = Math.ceil(products.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const displayedProducts = products.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    let isMounted = true;

    const loadFeatured = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await listProducts();

        if (!isMounted) {
          return;
        }

        const sorted = [...data].sort((a, b) => b.stock - a.stock || b.price - a.price);
        setProducts(sorted);
        setCurrentPage(0);
      } catch (_error) {
        if (isMounted) {
          setError('Unable to reach the products API. Showing curated demo picks.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadFeatured();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <Head>
        <title>ShopLite · Featured products</title>
      </Head>
      <main className="layout">
        <div className="section-title">
          <div>
            <h1 className="page-title">Featured collections</h1>
            <p className="page-subtitle">
              Browse {products.length} featured products from our curated selection.
            </p>
          </div>
          <Link className="button button-ghost" href="/">
            Back to home
          </Link>
        </div>

        {isLoading ? (
          <div className="empty-state">
            <h2>Fetching featured products</h2>
            <p>Give us a second while we analyze recent performance.</p>
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <h2>No featured products yet</h2>
            <p>Promote items from the admin console to highlight them here.</p>
            {user?.role === 'admin' && (
              <Link className="button button-primary" href="/admin">
                Open admin
              </Link>
            )}
          </div>
        ) : (
          <>
            <section className="product-grid">
              {displayedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </section>

            {totalPages > 1 && (
              <div className="pagination" style={{ marginTop: '3rem', display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center' }}>
                <button
                  className="button button-ghost"
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  disabled={currentPage === 0}
                >
                  ← Previous
                </button>
                <span className="form-hint" style={{ margin: '0 1rem' }}>
                  Page {currentPage + 1} of {totalPages}
                </span>
                <button
                  className="button button-ghost"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                  disabled={currentPage === totalPages - 1}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="empty-state" role="status">
            <h2>Unable to load products</h2>
            <p>{error}</p>
            <Link className="button button-primary" href="/">
              Back to home
            </Link>
          </div>
        )}
      </main>
    </>
  );
};

export default FeaturedProductsPage;
