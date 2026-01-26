import type { Order } from './order';

export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  orders?: Order[]; // Orders load lazily on demand
}
