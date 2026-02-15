import type { Order } from './order';

export type UserRole = 'USER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'DISABLED' | 'BANNED';

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  orders?: Order[]; // Orders load lazily on demand
}
