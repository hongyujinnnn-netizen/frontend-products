import type { Review } from '../types/review';

const buildKey = (productId: number) => `reviews_${productId}`;

const readReviews = (productId: number): Review[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  const value = localStorage.getItem(buildKey(productId));
  return value ? (JSON.parse(value) as Review[]) : [];
};

const writeReviews = (productId: number, reviews: Review[]) => {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(buildKey(productId), JSON.stringify(reviews));
};

export const getReviews = (productId: number) => readReviews(productId);

export const addReview = (review: Review) => {
  const current = readReviews(review.productId);
  writeReviews(review.productId, [review, ...current]);
};
