'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import type { Product } from '../types/product';
import { useMessage } from '../hooks/useMessage';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../utils/format';

interface ProductCardProps {
  product: Product;
}

const pickBadge = (product: Product): { label: string; tone: string } | null => {
  const tags = (product.tags ?? '').toLowerCase();
  if (product.stock > 0 && product.stock <= 5) return { label: 'LOW', tone: 'warning' };
  if (tags.includes('sale') || tags.includes('discount')) return { label: 'SALE', tone: 'danger' };
  if (tags.includes('new')) return { label: 'NEW', tone: 'accent' };
  if (tags.includes('top')) return { label: 'TOP', tone: 'primary' };
  return null;
};

const getCategory = (product: Product): string => {
  const first = (product.categories ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)[0];
  return first ?? 'Featured';
};

const ProductCard = ({ product }: ProductCardProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const { showMessage } = useMessage();
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const router = useRouter();

  const badge = pickBadge(product);
  const imageUrl = product.imageUrl ?? '/product-placeholder.svg';
  const category = getCategory(product);

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      showMessage('error', 'Please sign in before adding items to your cart');
      void router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
      return;
    }
    if (product.stock <= 0) {
      showMessage('error', 'This product is out of stock');
      return;
    }
    setIsAdding(true);
    try {
      addItem(product, 1);
      showMessage('success', `${product.name} added to cart (${formatCurrency(product.price)})`);
    } catch {
      showMessage('error', 'Failed to add item to cart');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Link className="product-card-link" href={`/product/${product.id}`}>
      <article className="product-card-v2">
        <div className="product-card-v2-media">
          <Image
            alt={product.name}
            className="product-card-v2-image"
            src={imageUrl}
            width={480}
            height={480}
            priority={false}
          />
          {badge && <span className={`product-card-v2-badge tone-${badge.tone}`}>{badge.label}</span>}
          <button
            type="button"
            className="product-card-v2-wishlist"
            aria-label="Save to wishlist"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>
        <div className="product-card-v2-body">
          <span className="product-card-v2-eyebrow">{category}</span>
          <h3 className="product-card-v2-title">{product.name}</h3>
          <div className="product-card-v2-rating">
            <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M12 .587l3.668 7.431L24 9.748l-6 5.847 1.416 8.252L12 19.771l-7.416 4.076L6 15.595 0 9.748l8.332-1.73z"/></svg>
            <span>4.8 · 248 reviews</span>
          </div>
        </div>
        <div className="product-card-v2-footer">
          <span className="product-card-v2-price">{formatCurrency(product.price)}</span>
          <button
            type="button"
            className="product-card-v2-add"
            aria-label={`Add ${product.name} to cart`}
            onClick={handleAddToCart}
            disabled={isAdding || product.stock <= 0}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </article>
    </Link>
  );
};

export default ProductCard;
