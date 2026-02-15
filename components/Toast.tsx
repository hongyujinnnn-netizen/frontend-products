import { useMessage } from '../hooks/useMessage';

const Toast = () => {
  const { message, dismiss } = useMessage();

  if (!message) {
    return null;
  }

  const role = message.type === 'error' ? 'alert' : 'status';

  return (
    <div className={`toast toast--${message.type}`} role={role} aria-live="polite">
      <span className="toast-text">{message.text}</span>
      <button className="toast-close" type="button" onClick={dismiss} aria-label="Dismiss notification">
        Close
      </button>
    </div>
  );
};

export default Toast;
