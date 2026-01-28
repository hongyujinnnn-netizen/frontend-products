import { getAuthToken } from '../utils/auth';
import { parseApiError } from './apiError';
import { clearAuthToken } from '../utils/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api';

class ApiError extends Error {
  status: number;
  originalError?: Error;

  constructor(message: string, status: number, originalError?: Error) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
    this.originalError = originalError;
  }
}

export const apiFetch = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const token = getAuthToken();

  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    // Debug logging
    console.log(`[API] ${options.method || 'GET'} ${API_BASE_URL}${path}`, {
      hasToken: !!token,
      tokenLength: token?.length,
    });

    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers,
      ...options,
    });

    // Handle 401 Unauthorized - clear auth and redirect to login
    if (response.status === 401) {
      console.error('[API] 401 Unauthorized - clearing auth and redirecting to login');
      clearAuthToken();
      // Redirect to login page if on browser
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new ApiError('Unauthorized. Please log in again.', 401);
    }

    if (!response.ok) {
      const errorMessage = await parseApiError(response);
      throw new ApiError(errorMessage, response.status);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    // If it's already an ApiError, rethrow it
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Handle network errors and other errors
    if (error instanceof Error) {
      throw new ApiError(
        error.message || 'Failed to connect to the server. Please check your connection.',
        0,
        error
      );
    }
    
    throw new ApiError('An unexpected error occurred', 0);
  }
};
