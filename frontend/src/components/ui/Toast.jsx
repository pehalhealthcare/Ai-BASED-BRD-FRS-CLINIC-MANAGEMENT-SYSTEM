import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { clsx } from 'clsx';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';

// ============================================================
// Toast Context
// ============================================================

const ToastContext = createContext(null);

let toastIdCounter = 0;

/**
 * ToastProvider — wrap the app to enable toast notifications.
 */
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ message, type = 'info', duration = 4000, title }) => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type, title }]);
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
    return id;
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

/**
 * useToast — imperative toast API.
 *
 * @returns {{ success, error, info, warning, show }}
 *
 * @example
 * const toast = useToast();
 * toast.success('Profile saved!');
 * toast.error('Something went wrong.');
 */
export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');

  return {
    success: (message, opts) => ctx.addToast({ message, type: 'success', ...opts }),
    error:   (message, opts) => ctx.addToast({ message, type: 'error',   ...opts }),
    info:    (message, opts) => ctx.addToast({ message, type: 'info',    ...opts }),
    warning: (message, opts) => ctx.addToast({ message, type: 'warning', ...opts }),
    show:    (opts)          => ctx.addToast(opts),
    remove:  ctx.removeToast,
  };
};

// ============================================================
// Toast Item
// ============================================================

const iconMap = {
  success: <CheckCircle2 size={18} className="text-aura-500 dark:text-aura-400 shrink-0" />,
  error:   <XCircle     size={18} className="text-rose-500 dark:text-rose-400 shrink-0" />,
  warning: <AlertCircle size={18} className="text-amber-500 dark:text-amber-400 shrink-0" />,
  info:    <Info        size={18} className="text-sky-500 dark:text-sky-400 shrink-0" />,
};

const borderMap = {
  success: 'border-l-aura-500',
  error:   'border-l-rose-500',
  warning: 'border-l-amber-500',
  info:    'border-l-sky-500',
};

const ToastItem = ({ toast, onRemove }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      role="alert"
      className={clsx(
        'flex items-start gap-3 px-4 py-3.5 rounded-xl',
        'bg-white dark:bg-navy-800',
        'border border-slate-100 dark:border-white/[0.08]',
        'border-l-4 shadow-elevated dark:shadow-elevated-dark',
        'min-w-[300px] max-w-sm w-full',
        borderMap[toast.type],
        'transition-all duration-300',
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
      )}
    >
      {iconMap[toast.type]}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{toast.title}</p>
        )}
        <p className={clsx('text-sm text-slate-600 dark:text-slate-400', toast.title && 'mt-0.5')}>
          {toast.message}
        </p>
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="p-1 -mr-1 shrink-0 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
};

// ============================================================
// Toast Container
// ============================================================

const ToastContainer = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 items-end"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

export default ToastProvider;
