import { useEffect, useMemo, useState } from 'react';
import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ProductCard from '../components/ProductCard';
import { Seo } from '../components/Seo';
import type { Product } from '../types/product';
import { apiFetch } from '../services/api';
import { config } from '../lib/config';
import { getDefaultMetadata } from '../lib/seoMetadata';

const trustLogos = ['Northwind', 'Lumen', 'Arcade', 'Fieldnote', 'Brightside'];

const featureHighlights = [
  {
    icon: '🎨',
    title: 'Beautiful design',
    description: 'Stunning product displays',
  },
  {
    icon: '⚡',
    title: 'Lightning fast',
    description: 'Optimized performance',
  },
  {
    icon: '📦',
    title: 'Real inventory',
    description: 'Live stock tracking',
  },
  {
    icon: '🔒',
    title: 'Secure payments',
    description: 'Protected checkout',
  },
];

const performanceSignals = [
  { stat: '10K+', label: 'Happy customers' },
  { stat: '99.9%', label: 'Uptime guarantee' },
  { stat: '24/7', label: 'Customer support' },
];

const curatedCollections = [
  {
    title: 'Bestsellers',
    description: 'Most loved products',
  },
  {
    title: 'New arrivals',
    description: 'Just in stock',
  },
  {
    title: 'Limited edition',
    description: 'Exclusive items',
  },
];

const testimonials = [
  {
    quote: 'Best shopping experience ever!',
    author: 'Sarah Johnson',
    role: 'Verified buyer',
    rating: 5,
  },
  {
    quote: 'Quality and fast shipping. Highly recommend!',
    author: 'Michael Chen',
    role: 'Verified buyer',
    rating: 5,
  },
  {
    quote: 'Exceeded my expectations. Will shop again!',
    author: 'Emma Rodriguez',
    role: 'Verified buyer',
    rating: 5,
  },
];

const HomePage: NextPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await apiFetch<Product[]>('/products');
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setProducts(data);
        } else if (isMounted) {
          setError('No products available at the moment.');
        }
      } catch (_err) {
        if (isMounted) {
          setError('Unable to load products. Please try again later.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const term = typeof router.query.search === 'string' ? router.query.search : '';
    setSearchTerm(term);
  }, [router.query.search]);

  const displayedProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return products.slice(0, 6);
    }

    return products.filter((product) => {
      const haystack = `${product.name} ${product.description ?? ''}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [products, searchTerm]);

  const hasActiveSearch = searchTerm.trim().length > 0;
  const metadata = getDefaultMetadata();

  return (
    <>
      <Seo metadata={metadata} />
      <main className="layout">
        <section className="hero">
          <span className="badge">🎉 Welcome to ShopLite</span>
          <h1 className="hero-title">Premium shopping experience</h1>
          <p className="hero-lede">
            Discover quality products with fast shipping and exceptional service
          </p>
          <div className="actions">
            <Link className="button button-primary" href="/product/featured">
              Shop now
            </Link>
            <Link className="button button-ghost" href="/search">
              Browse all
            </Link>
          </div>
        </section>
        <section className="section-spaced">
          <div className="section-title">
            <div>
              <h2>Why shop with us?</h2>
            </div>
          </div>
          <div className="feature-grid">
            {featureHighlights.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <span className="feature-icon" aria-hidden="true">
                  {feature.icon}
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="highlight-grid section-spaced">
          {curatedCollections.map((collection) => (
            <article className="highlight-card" key={collection.title}>
              <h3>{collection.title}</h3>
              <p>{collection.description}</p>
              <Link className="button button-ghost" href="/product/featured">
                Explore →
              </Link>
            </article>
          ))}
        </section>

        <div className="section-title section-spaced">
          <div>
            <h2>Featured products</h2>
            <p className="section-subtitle">
              Bestsellers & customer favorites
            </p>
          </div>
          <Link className="button button-ghost" href="/product/featured">
            Browse all
          </Link>
        </div>


        {error ? (
          <div className="empty-state" role="alert">
            <h2>⚠️ {error.includes('No products') ? 'No products available' : 'Error loading products'}</h2>
            <p>{error}</p>
            <Link className="button button-primary" href="/">
              Try again
            </Link>
          </div>
        ) : isLoading ? (
          <div className="empty-state">
            <h2>Loading products</h2>
            <p>Fetching the latest items...</p>
          </div>
        ) : displayedProducts.length === 0 ? (
          <div className="empty-state">
            <h2>No products found</h2>
            <p>Check back soon for amazing items</p>
          </div>
        ) : (
          <section className="product-grid">
            {displayedProducts.slice(0, 3).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </section>
        )}

        <section className="testimonial-section section-spaced">
          <div className="section-title">
            <div>
              <h2>⭐ Loved by our customers</h2>
              <p className="section-subtitle">See what real shoppers think</p>
            </div>
          </div>
          <div className="testimonial-grid">
            {testimonials.map((testimonial) => (
              <figure className="testimonial-card" key={testimonial.author}>
                <div className="testimonial-rating">
                  {'⭐'.repeat(testimonial.rating)}
                </div>
                <blockquote className="testimonial-quote">{testimonial.quote}</blockquote>
                <figcaption className="testimonial-author">
                  <span>{testimonial.author}</span>
                  <span>{testimonial.role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="cta-section section-spaced">
          <h2>Ready to find your next favorite?</h2>
          <p>Browse our curated collection of premium products</p>
          <Link className="button button-primary button-large" href="/product/featured">
            Start shopping today
          </Link>
        </section>
      </main>
    </>
  );
};

export default HomePage;
