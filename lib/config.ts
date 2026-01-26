/**
 * Application configuration
 * Centralizes environment-based settings
 */

export const config = {
  // API configuration
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api',

  // Demo mode - uses fallback data when enabled
  isDemoMode: process.env.NEXT_PUBLIC_DEMO === 'true',

  // Environment
  environment: (process.env.NODE_ENV as 'development' | 'production' | 'test') ?? 'development',

  // Feature flags
  features: {
    enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== 'false',
    enableErrorTracking: process.env.NEXT_PUBLIC_ENABLE_ERROR_TRACKING !== 'false',
  },

  // Site metadata
  site: {
    name: 'ShopLite',
    description: 'Modern e-commerce platform built with Next.js and Spring Boot',
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
    logo: '/logo.svg',
    twitterHandle: '@shoplite',
  },
};

/**
 * Fallback product data for demo mode
 */
export const fallbackProducts = [
  {
    id: 1,
    name: 'Starter Pack',
    description: 'Essential tools for your daily tasks.',
    price: 19.99,
    stock: 12,
    imageUrl: 'https://via.placeholder.com/600x400?text=Starter',
  },
  {
    id: 2,
    name: 'Pro Bundle',
    description: 'Advanced features for power users.',
    price: 49.99,
    stock: 5,
    imageUrl: 'https://via.placeholder.com/600x400?text=Pro',
  },
  {
    id: 3,
    name: 'Ultimate Kit',
    description: 'Everything you need to scale your operation.',
    price: 89.0,
    stock: 3,
    imageUrl: 'https://via.placeholder.com/600x400?text=Ultimate',
  },
];
