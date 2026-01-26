/**
 * SEO and metadata utilities
 * Helps generate proper meta tags and Open Graph data
 */

import { config } from './config';

export interface SeoMetadata {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'product' | 'article';
  twitterHandle?: string;
  author?: string;
  publishedDate?: string;
  modifiedDate?: string;
}

/**
 * Generate Open Graph meta tags
 */
export function generateOgTags(metadata: SeoMetadata) {
  return {
    'og:title': metadata.title,
    'og:description': metadata.description,
    'og:image': metadata.ogImage || `${config.site.url}/og-image.png`,
    'og:type': metadata.ogType || 'website',
    'og:url': metadata.canonical || config.site.url,
    'og:site_name': config.site.name,
  };
}

/**
 * Generate Twitter card meta tags
 */
export function generateTwitterTags(metadata: SeoMetadata) {
  return {
    'twitter:card': 'summary_large_image',
    'twitter:title': metadata.title,
    'twitter:description': metadata.description,
    'twitter:image': metadata.ogImage || `${config.site.url}/og-image.png`,
    'twitter:site': config.site.twitterHandle,
  };
}

/**
 * Generate structured data (JSON-LD)
 */
export function generateStructuredData(type: 'Organization' | 'Product' | 'Article', data: any) {
  const baseData = {
    '@context': 'https://schema.org',
    '@type': type,
  };

  if (type === 'Organization') {
    return {
      ...baseData,
      name: config.site.name,
      url: config.site.url,
      logo: `${config.site.url}${config.site.logo}`,
      ...data,
    };
  }

  if (type === 'Product') {
    return {
      ...baseData,
      name: data.name,
      description: data.description,
      image: data.imageUrl,
      price: data.price,
      priceCurrency: 'USD',
      availability: data.stock > 0 ? 'InStock' : 'OutOfStock',
      ...data,
    };
  }

  if (type === 'Article') {
    return {
      ...baseData,
      headline: data.title,
      description: data.description,
      image: data.image,
      author: {
        '@type': 'Person',
        name: data.author || config.site.name,
      },
      datePublished: data.publishedDate,
      dateModified: data.modifiedDate || data.publishedDate,
      ...data,
    };
  }

  return baseData;
}

/**
 * Product page metadata
 */
export function getProductMetadata(product: any): SeoMetadata {
  return {
    title: `${product.name} | ${config.site.name}`,
    description: product.description || `Buy ${product.name} at ${config.site.name}`,
    canonical: `${config.site.url}/product/${product.id}`,
    ogImage: product.imageUrl,
    ogType: 'product',
  };
}

/**
 * Default metadata
 */
export function getDefaultMetadata(): SeoMetadata {
  return {
    title: `${config.site.name} - ${config.site.description}`,
    description: config.site.description,
    canonical: config.site.url,
    ogImage: `${config.site.url}/og-image.png`,
  };
}
