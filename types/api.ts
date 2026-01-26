export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  tokenType: 'Bearer';
  role?: string;
}

export interface OrderRequestItem {
  productId: number;
  quantity: number;
}

export interface OrderRequest {
  items: OrderRequestItem[];
}
