import type { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { getProduct, listProducts } from '../../services/products';
import type { Product } from '../../types/product';
import ProductCard from '../../components/ProductCard';
import { addToCart } from '../../utils/cart';
import { useMessage } from '../../hooks/useMessage';

const placeholderHighlights = ['Premium materials built for daily use', 'Fast fulfillment with end-to-end tracking', 'Seamless integration with your existing checkout'];

const buildPlaceholderProduct = (numericId: number): Product => ({
  id: numericId,
  name: `Product ${numericId}`,
  description:
    'Product details will be available once the backend is connected. In the meantime, explore how the UI renders real catalog copy.',
  price: 64,
  stock: 8,
  imageUrl: 'https://via.placeholder.com/720x480?text=Product',
});

const ProductDetailPage: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const { showMessage } = useMessage();

  useEffect(() => {
    if (typeof id !== 'string') {
      return;
    }

    const numericId = Number(id);

    if (Number.isNaN(numericId)) {
      setError('Invalid product identifier.');
      return;
    }

    let isMounted = true;

    const loadProduct = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getProduct(numericId);
        if (!isMounted) {
          return;
        }

        setProduct(data);
      } catch (_error) {
        if (!isMounted) {
          return;
        }

        setError('We could not retrieve this product from the API. Showing placeholder details instead.');
        setProduct(buildPlaceholderProduct(numericId));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadProduct();

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!product?.id) {
      return;
    }

    let isMounted = true;

    const loadRelated = async () => {
      try {
        const data = await listProducts();
        if (!isMounted) {
          return;
        }

        const filtered = data.filter((item) => item.id !== product.id).slice(0, 3);
        setRelatedProducts(filtered);
      } catch (_error) {
        if (isMounted) {
          setRelatedProducts([]);
        }
      }
    };

    void loadRelated();

    return () => {
      isMounted = false;
    };
  }, [product?.id]);

  const stockLabel = useMemo(() => {
    if (!product) {
      return '';
    }

    if (product.stock <= 0) {
      return 'Currently unavailable';
    }

    if (product.stock < 4) {
      return 'Low inventory';
    }

    return `${product.stock} units available`;
  }, [product]);

  const handleAddToCart = async () => {
    if (!product) return;
    
    if (product.stock <= 0) {
      showMessage('error', 'This product is out of stock');
      return;
    }

    setIsAddingToCart(true);
    try {
      addToCart(product, 1);
      showMessage('success', `✓ Added to cart! $${product.price.toFixed(2)}`);
    } catch (error) {
      showMessage('error', 'Failed to add item to cart');
    } finally {
      setIsAddingToCart(false);
    }
  };

  if (isLoading || !product) {
    return (
      <main className="layout">
        <div className="empty-state">
          <h2>{isLoading ? 'Fetching product details' : 'Preparing product view'}</h2>
          <p>We are retrieving the latest data from your Spring Boot API.</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <Head>
        <title>{product.name} · ShopLite</title>
      </Head>
      <main className="layout">
        <div className="section-title">
          <div>
            <h1 className="page-title">{product.name}</h1>
            <p className="page-subtitle">
              Elevate merch drops, onboarding kits, and digital-first experiences with a premium presentation.
            </p>
          </div>
          <Link className="button button-ghost" href="/product/featured">
            Browse featured
          </Link>
        </div>

        {error && (
          <div className="status-message status-message-error" role="alert">
            <span>{error}</span>
            <span className="form-hint">
              Ensure the Spring Boot product endpoint is reachable at http://localhost:8080/api/products/{'{id}'}.
            </span>
          </div>
        )}

        <article className="product-detail">
          <img
            alt={product.name}
            src={product.imageUrl ?? 'https://via.placeholder.com/720x480?text=Product'}
            className="product-image"
          />
          <div className="product-meta">
            <p className="product-price">${product.price.toFixed(2)}</p>
            <span className={`product-stock ${product.stock <= 0 ? 'is-empty' : ''}`}>{stockLabel}</span>
            <p>{product.description}</p>
            <ul className="product-highlights">
              {placeholderHighlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
            <div className="product-cta">
              <button 
                className="button button-primary" 
                type="button"
                onClick={handleAddToCart}
                disabled={isAddingToCart || !product || product.stock <= 0}
              >
                {isAddingToCart ? 'Adding...' : 'Add to cart'}
              </button>
              <button className="button button-ghost" type="button">
                Save for later
              </button>
            </div>
          </div>
        </article>

        {relatedProducts.length > 0 && (
          <section className="section-spaced">
            <div className="section-title">
              <div>
                <h2>You might also like</h2>
                <p className="section-subtitle">Customers frequently explore these complementary products.</p>
              </div>
            </div>
            <div className="product-grid">
              {relatedProducts.map((related) => (
                <ProductCard key={related.id} product={related} />
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
};

export default ProductDetailPage;
