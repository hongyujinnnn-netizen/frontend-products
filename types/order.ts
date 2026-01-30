import type { Product } from './product';
import type { User } from './user';

export interface OrderItem {
  id: number;
  product: Product;
  quantity: number;
  price: number;
}

export interface Order {
  id: number;
  userId: number;
  total: number;
  createdAt: string;
  items: OrderItem[];
  user?: User;
  status?: 'PENDING' | 'PAID' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
  customerName?: string;
  customerEmail?: string;
  username?: string;
  user_email?: string;
  userEmail?: string;
  useremail?: string;
}
