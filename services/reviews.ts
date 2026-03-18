import { apiFetch } from './api';
import type { Review } from '../types/review';

export type ReviewSort = 'newest' | 'highest' | 'lowest';
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'HIDDEN';

export interface ReviewSummary {
  productId: number;
  averageRating: number;
  reviewCount: number;
  countsByRating: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface CreateReviewPayload {
  rating: number;
  title: string;
  comment: string;
  reviewerName?: string | null;
}

export const listProductReviews = (productId: number) =>
  apiFetch<Review[]>(`/products/${productId}/reviews`);

export const getProductReviewSummary = (productId: number) =>
  apiFetch<{ productId: number; averageRating: number; reviewCount: number; count1: number; count2: number; count3: number; count4: number; count5: number }>(
    `/products/${productId}/reviews/summary`
  ).then((raw) => ({
    productId: raw.productId,
    averageRating: raw.averageRating,
    reviewCount: raw.reviewCount,
    countsByRating: {
      1: raw.count1,
      2: raw.count2,
      3: raw.count3,
      4: raw.count4,
      5: raw.count5,
    },
  }));

export const createProductReview = (productId: number, payload: CreateReviewPayload) =>
  apiFetch<Review>(`/products/${productId}/reviews`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export interface AdminReview extends Review {
  status: ReviewStatus;
  helpfulCount: number;
}

export const listAdminReviews = (filters?: { status?: ReviewStatus; productId?: number; rating?: number }) => {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (typeof filters?.productId === 'number') params.set('productId', String(filters.productId));
  if (typeof filters?.rating === 'number') params.set('rating', String(filters.rating));
  const qs = params.toString();
  return apiFetch<AdminReview[]>(`/admin/reviews${qs ? `?${qs}` : ''}`);
};

export const moderateReview = (reviewId: number | string, payload: { status: ReviewStatus; reason?: string | null }) =>
  apiFetch<AdminReview>(`/admin/reviews/${reviewId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: payload.status, reason: payload.reason ?? null }),
  });

