/**
 * Centralized API error handler
 * Reduces duplication of error handling across the application
 */

export interface ApiErrorResponse {
  message?: string;
  error?: string;
  details?: string;
}

export function getErrorMessage(error: unknown): string {
  // Handle native Error objects
  if (error instanceof Error) {
    return error.message;
  }

  // Handle API error responses
  if (typeof error === 'object' && error !== null) {
    const apiError = error as ApiErrorResponse;
    if (apiError.message) return apiError.message;
    if (apiError.error) return apiError.error;
    if (apiError.details) return apiError.details;
  }

  // Fallback for unknown error types
  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Parse error from fetch response
 */
export async function parseApiError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return getErrorMessage(data);
  } catch {
    // If response body isn't JSON, use status text
    const statusMessages: Record<number, string> = {
      400: 'Invalid request. Please check your input.',
      401: 'Unauthorized. Please log in again.',
      403: 'You do not have permission to perform this action.',
      404: 'The requested resource was not found.',
      500: 'Server error. Please try again later.',
      503: 'Service temporarily unavailable. Please try again later.',
    };

    return statusMessages[response.status] || `Request failed with status ${response.status}`;
  }
}

/**
 * Type guard for checking if error is an API error with status code
 */
export function isApiError(error: unknown): error is { status: number; message: string } {
  return typeof error === 'object' && error !== null && 'status' in error && 'message' in error;
}
