export interface Review {
  id: number | string;
  productId: number;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
  reviewerName: string;
  verifiedPurchase: boolean;
  helpfulCount?: number;
}
