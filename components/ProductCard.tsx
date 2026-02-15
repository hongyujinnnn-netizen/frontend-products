'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '../types/product';
import { addToCart } from '../utils/cart';
import { useMessage } from '../hooks/useMessage';

interface ProductCardProps {
  product: Product;
}

const getTagTone = (tag: string): 'new' | 'top' | 'edition' | 'discount' | 'default' => {
  const normalized = tag.trim().toLowerCase();
  if (normalized.includes('new')) return 'new';
  if (normalized.includes('top')) return 'top';
  if (normalized.includes('edition')) return 'edition';
  if (normalized.includes('discount') || normalized.includes('sale')) return 'discount';
  return 'default';
};

const buildFlagLabel = (stock: number, tags: string[]) => {
  if (stock <= 0) {
    return 'Out of stock';
  }

  if (stock < 4) {
    return 'Low stock';
  }

  if (tags.length > 0) {
    return `${tags[0]}`;
  }

  return 'FEATURED';
};

const ProductCard = ({ product }: ProductCardProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const { showMessage } = useMessage();
  const tagTokens = (product.tags ?? '')
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(0, 3);
  const primaryTagTone = getTagTone(tagTokens[0] ?? '');
  
  const flagLabel = buildFlagLabel(product.stock ?? 0, tagTokens);
  const flagClass =
    product.stock <= 0
      ? 'product-card-flag-empty'
      : product.stock < 4
        ? 'product-card-flag-low'
        : `product-card-flag-featured product-card-flag-tag-${primaryTagTone}`;

  const imageUrl = product.imageUrl ?? 'https://via.placeholder.com/480x320?text=Product';
  
  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (product.stock <= 0) {
      showMessage('error', 'This product is out of stock');
      return;
    }
    
    setIsAdding(true);
    try {
      addToCart(product, 1);
      showMessage('success', `${product.name} added to cart (${product.price})`);
    } catch {
      showMessage('error', 'Failed to add item to cart');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <article className="product-card">
      <Link className="product-card-media" href={`/product/${product.id}`}>
        <Image
          alt={product.name}
          className="product-card-image"
          src={imageUrl}
          width={480}
          height={320}
          priority={false}
        />
        <span className={`product-card-flag ${flagClass}`}>{flagLabel}</span>
      </Link>
      <div className="product-card-body">
        <h2 className="product-card-title">{product.name}</h2>
        <p className="product-card-description">
          {product.description ?? 'Product description coming soon. Connect your API payload for richer copy.'}
        </p>
        {tagTokens.length > 0 && (
          <div className="product-preview-categories">
            {tagTokens.map((tag) => (
              <span key={tag} className={`preview-category-chip product-tag-chip product-tag-${getTagTone(tag)}`}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="product-card-meta">
        <span className="product-card-price">${product.price.toFixed(2)}</span>
        <span className={`product-card-stock ${product.stock <= 0 ? 'is-empty' : ''}`}>
          {product.stock > 0 ? `${product.stock} in stock` : 'Currently unavailable'}
        </span>
      </div>
      <div className="product-card-actions">
        <Link className="button button-primary" href={`/product/${product.id}`}>
          View details
        </Link>
        <button 
          className="button button-ghost" 
          type="button"
          onClick={handleAddToCart}
          disabled={isAdding || product.stock <= 0}
        >
          {isAdding ? 'Adding...' : 'Add to cart'}
        </button>
      </div>
    </article>
  );
};

export default ProductCard;
