import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { getErrorMessage } from '../services/apiError';

/**
 * Global message/notification system.
 * Use MessageProvider in _app and call useMessage() anywhere.
 */
export type MessageType = 'success' | 'error' | 'info' | 'warning';

export interface Message {
  type: MessageType;
  text: string;
}

interface MessageContextValue {
  message: Message | null;
  showMessage: (type: MessageType, text: string, duration?: number) => void;
  dismiss: () => void;
}

const MessageContext = createContext<MessageContextValue | null>(null);

export const MessageProvider = ({ children }: { children: ReactNode }) => {
  const [message, setMessage] = useState<Message | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const dismiss = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setMessage(null);
  }, []);

  const showMessage = useCallback((type: MessageType, text: string, duration = 4000) => {
    setMessage({ type, text });
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (duration > 0) {
      timeoutRef.current = window.setTimeout(() => {
        setMessage(null);
        timeoutRef.current = null;
      }, duration);
    }
  }, []);

  const value = useMemo(() => ({ message, showMessage, dismiss }), [message, showMessage, dismiss]);

  return <MessageContext.Provider value={value}>{children}</MessageContext.Provider>;
};

export function useMessage(duration = 4000) {
  const context = useContext(MessageContext);

  if (!context) {
    throw new Error('useMessage must be used within a MessageProvider');
  }

  const showMessage = useCallback(
    (type: MessageType, text: string) => {
      context.showMessage(type, text, duration);
    },
    [context, duration]
  );

  const showError = useCallback(
    (error: unknown, defaultMessage = 'An error occurred') => {
      const message = getErrorMessage(error) || defaultMessage;
      showMessage('error', message);
    },
    [showMessage]
  );

  return {
    message: context.message,
    showMessage,
    showError,
    dismiss: context.dismiss,
  };
}
