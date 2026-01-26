import { useCallback, useEffect, useMemo, useState } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ProductCard from '../components/ProductCard';
import { listProducts } from '../services/products';
import type { Product } from '../types/product';

const trendingQueries = ['bundle', 'kit', 'starter', 'premium'];

const SearchPage: NextPage = () => {
  const router = useRouter();
  const searchTerm = typeof router.query.q === 'string' ? router.query.q.trim() : '';
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!searchTerm) {
      setProducts([]);
      setError(null);
      return;
    }

    let isMounted = true;

    const runSearch = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await listProducts();
        if (!isMounted) {
          return;
        }

        setProducts(data);
      } catch (_error) {
        if (isMounted) {
          setError('Unable to fetch products from the API. Showing demo results instead.');
          setProducts([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void runSearch();

    return () => {
      isMounted = false;
    };
  }, [searchTerm]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) {
      return [];
    }

    const term = searchTerm.toLowerCase();
    return products
      .filter((product) => {
        const haystack = `${product.name} ${product.description ?? ''}`.toLowerCase();
        return haystack.includes(term);
      })
      .slice(0, 24);
  }, [products, searchTerm]);

  const handleSuggestion = useCallback(
    (suggestion: string) => {
      void router.push(
        {
          pathname: '/search',
          query: { q: suggestion },
        },
        undefined,
        { scroll: true }
      );
    },
    [router]
  );

  const hasTerm = searchTerm.length > 0;
  const hasResults = filteredProducts.length > 0;

  return (
    <>
      <Head>
        <title>{hasTerm ? `Search · ${searchTerm}` : 'Search products'} · ShopLite</title>
      </Head>
      <main className="layout">
        <section className="search-hero">
          <div>
            <span className="badge">Product search</span>
            <h1 className="search-title">
              {hasTerm ? `Results for “${searchTerm}”` : 'Find products across your catalog'}
            </h1>
            <p className="search-subtitle">
              {hasTerm
                ? 'Refine the query or explore highlighted keywords below to discover more products.'
                : 'Enter a keyword in the navigation bar to surface matching catalog entries instantly.'}
            </p>
          </div>
          <div className="search-suggestions">
            <span>Trending:</span>
            <div className="search-suggestion-pills">
              {trendingQueries.map((query) => (
                <button className="pill pill-button" type="button" key={query} onClick={() => handleSuggestion(query)}>
                  {query}
                </button>
              ))}
            </div>
          </div>
        </section>

        {!hasTerm && (
          <div className="empty-state">
            <h2>Try a product keyword</h2>
            <p>Search for product names, descriptions, or merchandising themes to get started.</p>
            <Link className="button button-primary" href="/">
              Browse featured items
            </Link>
          </div>
        )}

        {hasTerm && isLoading && (
          <div className="empty-state">
            <h2>Searching the catalog</h2>
            <p>We are fetching matches from your Spring Boot API. Hang tight.</p>
          </div>
        )}

        {hasTerm && !isLoading && hasResults && (
          <section className="product-grid">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </section>
        )}

        {hasTerm && !isLoading && !hasResults && (
          <div className="empty-state">
            <h2>No products match this search</h2>
            <p>Try a broader phrase or adjust the filters. Need a fresh view of the catalog?</p>
            <Link className="button button-ghost" href="/product/featured">
              View featured picks
            </Link>
          </div>
        )}

        {error && (
          <div className="empty-state" role="alert">
            <h2>Using demo content</h2>
            <p>{error}</p>
            <p className="form-hint">
              Confirm the API at http://localhost:8080/api/products is available before searching again.
            </p>
          </div>
        )}
      </main>
    </>
  );
};

export default SearchPage;
