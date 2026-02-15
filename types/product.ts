export interface Product {
  id: number;
  name: string;
  description?: string | null;
  tags?: string | null;
  features?: string | null;
  price: number;
  stock: number;
  imageUrl?: string | null;
  categories?: string | null;
}
export interface CartItem {
  product: Product;
  quantity: number;
}
