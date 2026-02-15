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
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'RELEVANCE' | 'PRICE_ASC' | 'PRICE_DESC' | 'STOCK' | 'NEWEST'>('RELEVANCE');
  const [page, setPage] = useState(1);

  const pageSize = 12;

  useEffect(() => {
    if (!searchTerm) {
      setProducts([]);
      setError(null);
      return;
    }

    let isMounted = true;
    const debounceId = window.setTimeout(() => {
      if (!isMounted) {
        return;
      }

      const runSearch = async () => {
        setIsLoading(true);
        setError(null);

        try {
          const data = await listProducts();
          if (!isMounted) {
            return;
          }

          setProducts(data);
        } catch {
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
    }, 250);

    return () => {
      isMounted = false;
      window.clearTimeout(debounceId);
    };
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, categoryFilter, minPrice, maxPrice, inStockOnly, sortBy]);

  const categories = useMemo(() => {
    const values = new Set<string>();
    products.forEach((product) => {
      const raw = product.categories ?? '';
      raw
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .forEach((entry) => values.add(entry));
    });
    return Array.from(values);
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) {
      return [];
    }

    const term = searchTerm.toLowerCase();
    let next = products
      .filter((product) => {
        const haystack = `${product.name} ${product.description ?? ''}`.toLowerCase();
        return haystack.includes(term);
      });

    if (categoryFilter !== 'ALL') {
      next = next.filter((product) => {
        const raw = product.categories ?? '';
        const tags = raw
          .split(',')
          .map((entry) => entry.trim().toLowerCase())
          .filter(Boolean);
        return tags.includes(categoryFilter.toLowerCase());
      });
    }

    const min = minPrice ? Number(minPrice) : null;
    const max = maxPrice ? Number(maxPrice) : null;
    next = next.filter((product) => {
      if (min !== null && product.price < min) {
        return false;
      }
      if (max !== null && product.price > max) {
        return false;
      }
      return true;
    });

    if (inStockOnly) {
      next = next.filter((product) => product.stock > 0);
    }

    const sorted = [...next];
    if (sortBy === 'PRICE_ASC') {
      sorted.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'PRICE_DESC') {
      sorted.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'STOCK') {
      sorted.sort((a, b) => b.stock - a.stock);
    } else if (sortBy === 'NEWEST') {
      sorted.sort((a, b) => b.id - a.id);
    }

    return sorted;
  }, [products, searchTerm, categoryFilter, minPrice, maxPrice, inStockOnly, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const pagedProducts = filteredProducts.slice((page - 1) * pageSize, page * pageSize);

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
        <title>{hasTerm ? `Search - ${searchTerm}` : 'Search products'} - ShopLite</title>
      </Head>
      <main className="layout">
        <section className="search-hero">
          <div>
            <span className="badge">Product search</span>
            <h1 className="search-title">
              {hasTerm ? `Results for "${searchTerm}"` : 'Find products across your catalog'}
            </h1>
            <p className="search-subtitle">
              {hasTerm
                ? 'Refine the query or explore highlighted keywords below to discover more products.'
                : 'Enter a keyword in the navigation bar to surface matching catalog entries instantly.'}
            </p>
            {hasTerm && (
              <p className="search-subtitle">
                {filteredProducts.length} results
              </p>
            )}
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

        {hasTerm && (
          <section className="search-filters">
            <div className="search-filter">
              <label htmlFor="categoryFilter">Category</label>
              <select
                id="categoryFilter"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                <option value="ALL">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="search-filter">
              <label htmlFor="minPrice">Min price</label>
              <input
                id="minPrice"
                type="number"
                min="0"
                placeholder="0"
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
              />
            </div>
            <div className="search-filter">
              <label htmlFor="maxPrice">Max price</label>
              <input
                id="maxPrice"
                type="number"
                min="0"
                placeholder="500"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
              />
            </div>
            <div className="search-filter search-filter-inline">
              <label>
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(event) => setInStockOnly(event.target.checked)}
                />
                In stock only
              </label>
            </div>
            <div className="search-filter">
              <label htmlFor="sortBy">Sort by</label>
              <select
                id="sortBy"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
              >
                <option value="RELEVANCE">Relevance</option>
                <option value="PRICE_ASC">Price: Low to high</option>
                <option value="PRICE_DESC">Price: High to low</option>
                <option value="STOCK">Stock</option>
                <option value="NEWEST">Newest</option>
              </select>
            </div>
          </section>
        )}

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
          <>
            <section className="product-grid">
              {pagedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </section>
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="button button-ghost"
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <span className="form-hint">
                  Page {page} of {totalPages}
                </span>
                <button
                  className="button button-ghost"
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </>
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
