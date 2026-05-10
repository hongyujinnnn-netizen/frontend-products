import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ProductCard from '../components/ProductCard';
import ProductCardSkeleton from '../components/ProductCardSkeleton';
import { Seo } from '../components/Seo';
import { getDefaultMetadata } from '../lib/seoMetadata';
import { useProducts } from '../hooks/useProducts';
import { useMessage } from '../hooks/useMessage';
import { formatCurrency } from '../utils/format';

type FilterKey = 'all' | 'new' | 'sale' | 'top' | 'instock';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'sale', label: 'Sale' },
  { key: 'top', label: 'Top rated' },
  { key: 'instock', label: 'In stock' },
];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const HomePage: NextPage = () => {
  const { products, loading, error, loadProducts } = useProducts();
  const router = useRouter();
  const { showMessage } = useMessage();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [email, setEmail] = useState('');
  const pageSize = 6;

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const searchTerm = useMemo(
    () => (typeof router.query.search === 'string' ? router.query.search : ''),
    [router.query.search],
  );

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return products.filter((product) => {
      if (term) {
        const haystack = `${product.name} ${product.description ?? ''}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      const tags = (product.tags ?? '').toLowerCase();
      if (filter === 'new' && !tags.includes('new')) return false;
      if (filter === 'sale' && !tags.includes('sale') && !tags.includes('discount')) return false;
      if (filter === 'top' && !tags.includes('top')) return false;
      if (filter === 'instock' && product.stock <= 0) return false;
      return true;
    });
  }, [products, searchTerm, filter]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, filter, products.length]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const displayedProducts = filteredProducts.slice((page - 1) * pageSize, page * pageSize);
  const metadata = getDefaultMetadata();
  const isEmpty = !loading && !error && filteredProducts.length === 0;
  const featured = products[0];
  const month = MONTHS[new Date().getMonth()];

  const handleNewsletter = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) return;
    showMessage('success', 'Thanks! Check your inbox for the welcome offer.');
    setEmail('');
  };

  return (
    <>
      <Seo metadata={metadata} />
      <main className="layout home-layout">
        <section className="hero-v2">
          <div className="hero-content">
            <span className="hero-badge">
              <span className="hero-badge-dot" />
              New collection — {month}
            </span>
            <h1 className="hero-title-v2">
              Curated essentials,
              <br />
              thoughtfully made.
            </h1>
            <p className="hero-subhead">
              Premium products with fast shipping, easy returns, and a story behind every piece.
            </p>
            <div className="hero-cta">
              <Link className="btn btn-primary" href="/search">
                Shop now
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </Link>
              <Link className="btn btn-outline" href="/product/featured">
                Browse catalog
              </Link>
            </div>
            <ul className="hero-trust">
              <li>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                Free shipping
              </li>
              <li>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                30-day returns
              </li>
              <li>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z"/></svg>
                24/7 support
              </li>
            </ul>
          </div>
          <div className="hero-visual">
            <div className="hero-visual-frame">
              {featured && (
                <>
                  {featured.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={featured.imageUrl} alt={featured.name} className="hero-featured-image" />
                  ) : (
                    <div className="hero-featured-placeholder">{featured.name?.charAt(0) ?? 'S'}</div>
                  )}
                  <div className="hero-price-tag">
                    <span className="hero-price-tag-label">From</span>
                    <strong>{formatCurrency(featured.price)}</strong>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <div className="section-title section-spaced">
          <div>
            <h2>Featured products</h2>
            <p className="section-subtitle">Bestsellers &amp; customer favorites</p>
          </div>
        </div>

        <div className="filter-pills">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`filter-pill ${filter === f.key ? 'is-active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {error ? (
          <div className="empty-card" role="alert">
            <div className="empty-card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h3>Error loading products</h3>
            <p>{error}</p>
            <button className="btn btn-primary" type="button" onClick={() => void loadProducts()}>
              Try again
            </button>
          </div>
        ) : loading ? (
          <section className="product-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </section>
        ) : isEmpty ? (
          <div className="empty-card">
            <div className="empty-card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <h3>No products found</h3>
            <p>Try a different filter or check back soon.</p>
          </div>
        ) : (
          <>
            <section className="product-grid">
              {displayedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </section>
            {totalPages > 1 && (
              <div className="pagination">
                <button className="btn btn-outline" type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  Previous
                </button>
                <span className="form-hint">Page {page} of {totalPages}</span>
                <button className="btn btn-outline" type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  Next
                </button>
              </div>
            )}
          </>
        )}

        <section className="newsletter-band section-spaced">
          <div className="newsletter-band-text">
            <span className="newsletter-eyebrow">JOIN THE CLUB</span>
            <h2 className="newsletter-headline">Get 10% off your first order</h2>
            <p className="newsletter-sub">Join our list and we&apos;ll send you exclusive drops and member-only sales.</p>
          </div>
          <form className="newsletter-form" onSubmit={handleNewsletter}>
            <input
              type="email"
              className="newsletter-input"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-light">
              Subscribe
            </button>
          </form>
        </section>
      </main>
    </>
  );
};

export default HomePage;
