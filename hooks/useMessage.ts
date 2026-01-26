import { useCallback, useState } from 'react';
import { getErrorMessage } from '../services/apiError';

/**
 * Custom hook for managing message/notification state
 * Used for success/error feedback across the app
 */
export type MessageType = 'success' | 'error' | 'info' | 'warning';

export interface Message {
  type: MessageType;
  text: string;
}

export function useMessage(duration = 4000) {
  const [message, setMessage] = useState<Message | null>(null);

  const showMessage = useCallback(
    (type: MessageType, text: string) => {
      setMessage({ type, text });
      if (duration > 0) {
        const timer = setTimeout(() => setMessage(null), duration);
        return () => clearTimeout(timer);
      }
    },
    [duration]
  );

  const showError = useCallback(
    (error: unknown, defaultMessage = 'An error occurred') => {
      const message = getErrorMessage(error) || defaultMessage;
      showMessage('error', message);
    },
    [showMessage]
  );

  const dismiss = useCallback(() => {
    setMessage(null);
  }, []);

  return {
    message,
    showMessage,
    showError,
    dismiss,
  };
}
