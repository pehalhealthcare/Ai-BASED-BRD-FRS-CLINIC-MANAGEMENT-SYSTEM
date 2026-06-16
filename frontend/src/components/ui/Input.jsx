import { forwardRef } from 'react';
import { clsx } from 'clsx';

/**
 * Input — premium form input with label, error/success states, and icon support.
 *
 * @param {object} props
 * @param {string} [props.label] - Field label
 * @param {string} [props.error] - Error message
 * @param {string} [props.hint] - Helper text
 * @param {React.ReactNode} [props.prefix] - Icon/content before input
 * @param {React.ReactNode} [props.suffix] - Icon/content after input
 * @param {boolean} [props.success] - Success state
 * @param {string} [props.className]
 */
const Input = forwardRef(function Input(
  { label, error, hint, prefix, suffix, success, className, id, ...props },
  ref
) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {prefix && (
          <div className="absolute left-3.5 flex items-center text-slate-400 dark:text-slate-500 pointer-events-none">
            {prefix}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full rounded-xl border px-4 py-2.5 text-sm',
            'bg-white dark:bg-navy-800',
            'text-slate-900 dark:text-slate-100',
            'placeholder:text-slate-400 dark:placeholder:text-slate-600',
            'transition-all duration-150',
            'outline-none focus:ring-2 focus:ring-offset-0',

            // Default border
            !error && !success && [
              'border-slate-200 dark:border-white/10',
              'focus:border-aura-500 focus:ring-aura-500/25',
            ],

            // Error state
            error && [
              'border-rose-400 dark:border-rose-500/60',
              'focus:border-rose-500 focus:ring-rose-500/20',
              'bg-rose-50/50 dark:bg-rose-900/10',
            ],

            // Success state
            success && [
              'border-aura-400 dark:border-aura-500/50',
              'focus:border-aura-500 focus:ring-aura-500/20',
            ],

            prefix && 'pl-10',
            suffix && 'pr-10',

            className
          )}
          {...props}
        />

        {suffix && (
          <div className="absolute right-3.5 flex items-center text-slate-400 dark:text-slate-500 pointer-events-none">
            {suffix}
          </div>
        )}
      </div>

      {(error || hint) && (
        <p className={clsx('text-xs', error ? 'text-rose-500 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400')}>
          {error || hint}
        </p>
      )}
    </div>
  );
});

export default Input;
