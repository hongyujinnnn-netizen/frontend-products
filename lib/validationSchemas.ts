import { z } from 'zod';

/**
 * Validation schemas for forms using Zod
 * Centralized validation logic for consistency across the app
 */

// Product form schema
export const productFormSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200, 'Name must be less than 200 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional().nullable(),
  tags: z.string().max(255, 'Tags must be less than 255 characters').optional().nullable(),
  features: z.string().max(5000, 'Features must be less than 5000 characters').optional().nullable(),
  categories: z.string().min(1, 'Category is required').max(255, 'Category must be less than 255 characters'),
  price: z
    .string()
    .or(z.number())
    .refine(val => !isNaN(Number(val)) && Number(val) > 0, 'Price must be greater than 0'),
  stock: z
    .string()
    .or(z.number())
    .refine(val => !isNaN(Number(val)) && Number(val) >= 0, 'Stock cannot be negative'),
  imageUrl: z.string().url('Image URL must be valid').optional().nullable(),
});

export type ProductFormData = z.infer<typeof productFormSchema>;

// User registration schema
export const registerFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  name: z.string().min(1, 'Name is required'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type RegisterFormData = z.infer<typeof registerFormSchema>;

// Login schema
export const loginFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginFormSchema>;

// Search/filter schema
export const searchFormSchema = z.object({
  query: z.string(),
  minPrice: z.number().nonnegative().optional(),
  maxPrice: z.number().nonnegative().optional(),
});

export type SearchFormData = z.infer<typeof searchFormSchema>;
