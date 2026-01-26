import { getAuthToken } from '../utils/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api';

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export const apiFetch = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });

  // If request fails with 401 and we had a token, retry without it for public endpoints
  if (!response.ok && response.status === 401 && token && options.method !== 'POST' && options.method !== 'PUT' && options.method !== 'DELETE') {
    const retryResponse = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!retryResponse.ok) {
      throw new ApiError('API request failed', retryResponse.status);
    }

    if (retryResponse.status === 204) {
      return undefined as T;
    }

    return (await retryResponse.json()) as T;
  }

  if (!response.ok) {
    throw new ApiError('API request failed', response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};
