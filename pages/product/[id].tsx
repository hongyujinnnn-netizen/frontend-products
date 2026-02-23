import type { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { getProduct, listProducts } from '../../services/products';
import type { Product } from '../../types/product';
import ProductCard from '../../components/ProductCard';
import { addToCart } from '../../utils/cart';
import { isInWishlist, toggleWishlist } from '../../utils/wishlist';
import { useMessage } from '../../hooks/useMessage';
import type { Review } from '../../types/review';
import { addReview, getReviews } from '../../utils/reviews';

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

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((part) => part.trim().charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

const getRelativeTimeLabel = (isoDate: string) => {
  const createdAt = new Date(isoDate).getTime();
  const now = Date.now();
  const delta = Math.max(0, now - createdAt);
  const minutes = Math.floor(delta / (1000 * 60));
  if (minutes < 60) {
    return `${Math.max(1, minutes)}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days}d ago`;
  }
  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months}mo ago`;
  }
  const years = Math.floor(months / 12);
  return `${years}y ago`;
};

const buildStarRow = (rating: number) =>
  `${'\u2605'.repeat(rating)}${'\u2606'.repeat(Math.max(0, 5 - rating))}`;

const ProductDetailPage: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'reviews'>('description');
  const [reviewAuthor, setReviewAuthor] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
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
      } catch {
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

    setIsSaved(isInWishlist(product.id));
    setReviews(getReviews(product.id));

    let isMounted = true;

    const loadRelated = async () => {
      try {
        const data = await listProducts();
        if (!isMounted) {
          return;
        }

        const currentCategorySet = new Set(
          (product.categories ?? '')
            .split(',')
            .map((part) => part.trim().toLowerCase())
            .filter(Boolean)
        );

        const filtered = data
          .filter((item) => item.id !== product.id)
          .map((item) => {
            const itemCategories = (item.categories ?? '')
              .split(',')
              .map((part) => part.trim().toLowerCase())
              .filter(Boolean);
            const sharedScore = itemCategories.reduce(
              (score, category) => score + (currentCategorySet.has(category) ? 1 : 0),
              0
            );
            return { item, sharedScore };
          })
          .sort((a, b) => b.sharedScore - a.sharedScore || b.item.stock - a.item.stock)
          .map((row) => row.item);

        setRelatedProducts(filtered.slice(0, 4));

        if (typeof window !== 'undefined') {
          const storageKey = 'recentlyViewedProducts';
          const current = Number(product.id);
          const previous = JSON.parse(window.localStorage.getItem(storageKey) ?? '[]') as number[];
          const nextIds = [current, ...previous.filter((id) => id !== current)].slice(0, 10);
          window.localStorage.setItem(storageKey, JSON.stringify(nextIds));

          const recent = nextIds
            .filter((id) => id !== current)
            .map((id) => data.find((item) => item.id === id))
            .filter((item): item is Product => Boolean(item))
            .slice(0, 4);
          setRecentProducts(recent);
        }
      } catch {
        if (isMounted) {
          setRelatedProducts([]);
          setRecentProducts([]);
        }
      }
    };

    void loadRelated();

    return () => {
      isMounted = false;
    };
  }, [product?.id, product?.categories]);

  useEffect(() => {
    if (!product?.id) return;

    const handleWishlistUpdate = () => {
      setIsSaved(isInWishlist(product.id));
    };

    window.addEventListener('wishlistUpdated', handleWishlistUpdate);
    return () => {
      window.removeEventListener('wishlistUpdated', handleWishlistUpdate);
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

  const productHighlights = useMemo(() => {
    const raw = product?.features?.trim();
    if (!raw) {
      return placeholderHighlights;
    }

    const parsed = raw
      .split(/\r?\n|[,;]+/)
      .map((entry) => entry.trim())
      .filter(Boolean)
      .slice(0, 6);

    return parsed.length > 0 ? parsed : placeholderHighlights;
  }, [product?.features]);

  const tagTokens = useMemo(
    () =>
      (product?.tags ?? '')
        .split(',')
        .map((token) => token.trim())
        .filter(Boolean)
        .slice(0, 4),
    [product?.tags]
  );

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length;
  }, [reviews]);

  const ratingBreakdown = useMemo(() => {
    const total = reviews.length || 1;
    return [5, 4, 3, 2, 1].map((score) => {
      const count = reviews.filter((review) => review.rating === score).length;
      const percent = Math.round((count / total) * 100);
      return { score, count, percent };
    });
  }, [reviews]);

  const galleryImages = useMemo(() => {
    const urls = [
      product?.imageUrl ?? 'https://via.placeholder.com/720x480?text=Product',
      ...relatedProducts.map((item) => item.imageUrl).filter((url): url is string => Boolean(url)),
    ];
    return Array.from(new Set(urls)).slice(0, 4);
  }, [product?.imageUrl, relatedProducts]);

  useEffect(() => {
    if (galleryImages.length > 0) {
      setSelectedImage(galleryImages[0]);
    }
  }, [galleryImages]);

  useEffect(() => {
    if (!product) return;
    if (product.stock <= 0) {
      setQuantity(1);
      return;
    }
    setQuantity((prev) => Math.min(Math.max(1, prev), product.stock));
  }, [product]);

  const handleAddToCart = async () => {
    if (!product) return;
    
    if (product.stock <= 0) {
      showMessage('error', 'This product is out of stock');
      return;
    }

    setIsAddingToCart(true);
    try {
      const nextQuantity = Math.min(quantity, Math.max(1, product.stock));
      addToCart(product, nextQuantity);
      showMessage('success', `Added ${nextQuantity} item(s) to cart!`);
    } catch {
      showMessage('error', 'Failed to add item to cart');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;
    if (product.stock <= 0) {
      showMessage('error', 'This product is out of stock');
      return;
    }

    try {
      const nextQuantity = Math.min(quantity, Math.max(1, product.stock));
      addToCart(product, nextQuantity);
      await router.push('/checkout');
    } catch {
      showMessage('error', 'Unable to start checkout');
    }
  };

  const handleToggleWishlist = () => {
    if (!product) return;
    const added = toggleWishlist(product);
    setIsSaved(added);
    showMessage('success', added ? 'Saved to wishlist.' : 'Removed from wishlist.');
  };

  const handleReviewSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!product) return;

    const trimmedAuthor = reviewAuthor.trim() || 'Verified buyer';
    const trimmedComment = reviewComment.trim();
    if (!trimmedComment) {
      showMessage('error', 'Please add a short review comment.');
      return;
    }

    const nextReview: Review = {
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      author: trimmedAuthor,
      rating: reviewRating,
      comment: trimmedComment,
      createdAt: new Date().toISOString(),
    };

    addReview(nextReview);
    setReviews((prev) => [nextReview, ...prev]);
    setReviewAuthor('');
    setReviewComment('');
    setReviewRating(5);
    showMessage('success', 'Thanks for your feedback.');
  };

  if (isLoading || !product) {
    return (
      <main className="layout mx-auto max-w-6xl px-4 py-10">
        <div className="empty-state rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h2>{isLoading ? 'Fetching product details' : 'Preparing product view'}</h2>
          <p>We are retrieving the latest data from your Spring Boot API.</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <Head>
        <title>{product.name} - ShopLite</title>
      </Head>
      <main className="layout mx-auto max-w-6xl px-4 py-10">
        <div className="section-title mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="page-title">{product.name}</h1>
            <p className="page-subtitle">
              Elevate merch drops, onboarding kits, and digital-first experiences with a premium presentation.
            </p>
          </div>
          <Link className="button button-ghost rounded-full px-4 py-2 text-sm" href="/product/featured">
            Browse featured
          </Link>
        </div>

        {error && (
          <div className="status-message status-message-error mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700" role="alert">
            <span>{error}</span>
            <span className="form-hint">
              Ensure the Spring Boot product endpoint is reachable at http://localhost:8080/api/products/{'{id}'}.
            </span>
          </div>
        )}

        <section className="product-hero-shell">
          <article className="product-detail product-detail-modern-v3 grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-2">
            <div className="product-gallery-shell relative">
              <button
                className="product-favorite-button absolute right-3 top-3 z-10 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm shadow"
                type="button"
                onClick={handleToggleWishlist}
                aria-label={isSaved ? 'Remove from wishlist' : 'Save to wishlist'}
              >
                {isSaved ? '♥' : '♡'}
              </button>
              <span className={`product-stock-badge inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${product.stock <= 0 ? 'is-empty bg-rose-100 text-rose-700 ring-rose-200' : product.stock < 4 ? 'is-low bg-amber-100 text-amber-700 ring-amber-200' : 'is-ok bg-emerald-100 text-emerald-700 ring-emerald-200'}`}>
                {stockLabel}
              </span>
              <Image
                alt={product.name}
                src={selectedImage ?? galleryImages[0]}
                className="product-image product-image-modern h-auto w-full rounded-xl object-cover"
                width={720}
                height={480}
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="product-image-overlay">
                {tagTokens.map((tag) => (
                  <span key={tag} className="pill inline-flex rounded-full bg-slate-900/80 px-2.5 py-1 text-xs font-medium text-white">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="product-thumbnail-row mt-3 grid grid-cols-4 gap-2">
                {galleryImages.map((imageUrl) => (
                  <button
                    key={imageUrl}
                    type="button"
                    className={`product-thumbnail overflow-hidden rounded-lg border ${imageUrl === (selectedImage ?? galleryImages[0]) ? 'is-active border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'}`}
                    onClick={() => setSelectedImage(imageUrl)}
                    aria-label="Select product image"
                  >
                    <Image alt={product.name} src={imageUrl} width={88} height={72} />
                  </button>
                ))}
              </div>
            </div>

            <div className="product-meta product-meta-modern-v3 flex flex-col gap-4">
              <div className="product-kicker">{tagTokens[0] ? `${tagTokens[0]} collection` : 'New collection'}</div>
              <h2 className="product-detail-title">{product.name}</h2>

              <div className="product-price-row flex flex-wrap items-center justify-between gap-3">
                <p className="product-price">${product.price.toFixed(2)}</p>
                <div className="product-rating-badge flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm">
                  <span className="rating-stars">{buildStarRow(Math.round(averageRating || 0))}</span>
                  <a href="#product-reviews">
                    {reviews.length > 0 ? `${averageRating.toFixed(1)} · ${reviews.length} reviews` : 'No reviews yet'}
                  </a>
                </div>
              </div>

              <p className="product-description-lead">
                {product.description ?? 'Product description coming soon. Connect your API payload for richer copy.'}
              </p>

              <div className="product-fact-grid grid gap-2 sm:grid-cols-2">
                <div className="product-fact-card rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <span className="product-fact-label">Availability</span>
                  <strong>{stockLabel}</strong>
                </div>
                <div className="product-fact-card rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <span className="product-fact-label">Shipping</span>
                  <strong>{product.stock > 0 ? 'Ships in 24h' : 'Backorder soon'}</strong>
                </div>
                <div className="product-fact-card rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <span className="product-fact-label">Return</span>
                  <strong>30-day return</strong>
                </div>
                <div className="product-fact-card rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <span className="product-fact-label">Size</span>
                  <strong>Standard fit</strong>
                </div>
                <div className="product-fact-card rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <span className="product-fact-label">Weight</span>
                  <strong>Lightweight build</strong>
                </div>
              </div>

              <div className="product-highlights-grid grid gap-2">
                {productHighlights.slice(0, 4).map((highlight) => (
                  <div key={highlight} className="product-highlight-card flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
                    <span className="highlight-dot" aria-hidden="true" />
                    <span>{highlight}</span>
                  </div>
                ))}
              </div>

              <div className="product-cta product-cta-modern flex flex-wrap items-center gap-3">
                <div className="quantity-picker inline-flex items-center gap-2 rounded-full border border-slate-300 px-2 py-1" aria-label="Quantity selector">
                  <button
                    type="button"
                    className="quantity-button inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300"
                    onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                  >
                    -
                  </button>
                  <span>{quantity}</span>
                  <button
                    type="button"
                    className="quantity-button inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300"
                    onClick={() => setQuantity((prev) => Math.min(Math.max(1, product.stock), prev + 1))}
                  >
                    +
                  </button>
                </div>
                <button
                  className="button button-dark rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isAddingToCart || !product || product.stock <= 0}
                >
                  {isAddingToCart ? 'Adding...' : 'Add to cart'}
                </button>
                <button className="button button-ghost rounded-full px-4 py-2 text-sm" type="button" onClick={handleBuyNow}>
                  Buy now
                </button>
                <span className="product-secure-note">Secure checkout • 30-day return</span>
              </div>
            </div>
          </article>
        </section>

        <section className="product-tabs-shell mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="product-tab-list mb-3 flex flex-wrap gap-2" role="tablist" aria-label="Product details tabs">
            <button type="button" className={`product-tab rounded-full px-3 py-1.5 text-sm ${activeTab === 'description' ? 'is-active bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`} onClick={() => setActiveTab('description')}>Description</button>
            <button type="button" className={`product-tab rounded-full px-3 py-1.5 text-sm ${activeTab === 'specifications' ? 'is-active bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`} onClick={() => setActiveTab('specifications')}>Specifications</button>
            <button type="button" className={`product-tab rounded-full px-3 py-1.5 text-sm ${activeTab === 'reviews' ? 'is-active bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`} onClick={() => setActiveTab('reviews')}>Reviews</button>
          </div>
          <div className="product-tab-panel rounded-lg border border-slate-200 bg-slate-50 p-4">
            {activeTab === 'description' && (
              <p className="product-description-lead">
                {product.description ?? 'Product description coming soon. Connect your API payload for richer copy.'}
              </p>
            )}
            {activeTab === 'specifications' && (
              <ul className="product-highlights list-disc space-y-1 pl-5">
                {productHighlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            )}
            {activeTab === 'reviews' && (
              <p className="product-description-lead">
                Rated {reviews.length > 0 ? averageRating.toFixed(1) : '0.0'} out of 5 from {reviews.length} review{reviews.length === 1 ? '' : 's'}.
                <a href="#product-reviews"> Jump to full reviews.</a>
              </p>
            )}
          </div>
        </section>

        {relatedProducts.length > 0 && (
          <section className="section-spaced mt-10">
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

        {recentProducts.length > 0 && (
          <section className="section-spaced mt-10">
            <div className="section-title mb-4">
              <div>
                <h2>Recently viewed</h2>
                <p className="section-subtitle">Continue where you left off.</p>
              </div>
            </div>
            <div className="product-grid grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {recentProducts.map((recent) => (
                <ProductCard key={recent.id} product={recent} />
              ))}
            </div>
          </section>
        )}

        <section className="section-spaced mt-10" id="product-reviews">
          <div className="section-title mb-4">
            <div>
              <h2>Reviews</h2>
              <p className="section-subtitle">Share feedback to help other shoppers.</p>
            </div>
          </div>

          <div className="reviews-grid grid gap-6 lg:grid-cols-[320px_1fr]">
            <form className="review-form rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={handleReviewSubmit}>
              <div className="review-form-title">
                <h3>Write a review</h3>
                <p>Tell other shoppers what stood out for you.</p>
              </div>
              <div className="form-field grid gap-1">
                <label className="form-label" htmlFor="reviewAuthor">Name</label>
                <input
                  id="reviewAuthor"
                  className="form-input h-10 rounded-md border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none"
                  value={reviewAuthor}
                  onChange={(event) => setReviewAuthor(event.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div className="form-field grid gap-1">
                <label className="form-label" htmlFor="reviewRating">Rating</label>
                <select
                  id="reviewRating"
                  className="form-input h-10 rounded-md border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none"
                  value={reviewRating}
                  onChange={(event) => setReviewRating(Number(event.target.value))}
                >
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={value}>{value} / 5</option>
                  ))}
                </select>
              </div>
              <div className="form-field grid gap-1">
                <label className="form-label" htmlFor="reviewComment">Comment</label>
                <textarea
                  id="reviewComment"
                  className="form-input rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  rows={4}
                  value={reviewComment}
                  onChange={(event) => setReviewComment(event.target.value)}
                  placeholder="Share what you liked..."
                />
              </div>
              <button className="button button-primary rounded-full px-4 py-2 text-sm font-medium" type="submit">
                Submit review
              </button>
            </form>

            <div className="review-list grid gap-4">
              <div className="review-summary-card rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="review-summary-top">
                  <strong>{reviews.length > 0 ? averageRating.toFixed(1) : '0.0'}</strong>
                  <span>{buildStarRow(Math.round(averageRating || 0))}</span>
                  <small>{reviews.length} review{reviews.length === 1 ? '' : 's'}</small>
                </div>
                <div className="review-bars mt-3 grid gap-2">
                  {ratingBreakdown.map((row) => (
                    <div key={row.score} className="review-bar-row grid grid-cols-[24px_1fr_24px] items-center gap-2 text-sm">
                      <span>{row.score}</span>
                      <div className="review-bar-track h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                        <span className="block h-full bg-blue-600" style={{ width: `${row.percent}%` }} />
                      </div>
                      <span>{row.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {reviews.length === 0 ? (
                <div className="empty-state rounded-xl border border-slate-200 bg-white p-8 text-center">
                  <h3>No reviews yet</h3>
                  <p>Be the first to share your experience.</p>
                </div>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="review-card rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="review-header mb-3 flex items-start justify-between gap-3">
                      <div className="review-author-block flex items-start gap-3">
                        <span className="review-avatar inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white" aria-hidden="true">{getInitials(review.author)}</span>
                        <div>
                          <strong>{review.author}</strong>
                          <div className="review-meta-row flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="review-verified inline-flex rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">Verified buyer</span>
                            <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                            <span>{getRelativeTimeLabel(review.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <span className="review-score">{buildStarRow(review.rating)}</span>
                    </div>
                    <p>{review.comment}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </>
  );
};

export default ProductDetailPage;

