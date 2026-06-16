import { forwardRef } from 'react';
import { clsx } from 'clsx';

const variants = {
  primary: [
    'bg-aura-600 text-white',
    'hover:bg-aura-700 active:bg-aura-800',
    'shadow-sm hover:shadow-glow-teal',
    'border border-aura-700/30',
    'dark:bg-aura-500 dark:hover:bg-aura-600 dark:border-aura-400/20',
  ],
  secondary: [
    'bg-white text-slate-800 border border-slate-200',
    'hover:bg-slate-50 active:bg-slate-100',
    'shadow-sm',
    'dark:bg-navy-700 dark:text-slate-100 dark:border-white/10',
    'dark:hover:bg-navy-600',
  ],
  ghost: [
    'bg-transparent text-slate-700 border border-transparent',
    'hover:bg-slate-100 active:bg-slate-200',
    'dark:text-slate-300 dark:hover:bg-white/8',
  ],
  danger: [
    'bg-rose-500 text-white border border-rose-600/30',
    'hover:bg-rose-600 active:bg-rose-700',
    'shadow-sm',
    'dark:bg-rose-600 dark:hover:bg-rose-700',
  ],
  accent: [
    'bg-indigo-500 text-white border border-indigo-600/30',
    'hover:bg-indigo-600 active:bg-indigo-700',
    'shadow-sm hover:shadow-glow-indigo',
    'dark:bg-indigo-500 dark:hover:bg-indigo-600',
  ],
  outline: [
    'bg-transparent text-aura-600 border border-aura-500',
    'hover:bg-aura-50 active:bg-aura-100',
    'dark:text-aura-400 dark:border-aura-500/50 dark:hover:bg-aura-500/10',
  ],
};

const sizes = {
  xs: 'px-2.5 py-1.5 text-xs rounded-lg gap-1.5',
  sm: 'px-3.5 py-2 text-sm rounded-xl gap-2',
  md: 'px-5 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-6 py-3 text-base rounded-2xl gap-2.5',
  xl: 'px-8 py-4 text-base rounded-2xl gap-3',
};

/**
 * Button — premium UI button with variants, sizes, loading state, and icon support.
 *
 * @param {object} props
 * @param {'primary'|'secondary'|'ghost'|'danger'|'accent'|'outline'} [props.variant='primary']
 * @param {'xs'|'sm'|'md'|'lg'|'xl'} [props.size='md']
 * @param {boolean} [props.loading=false]
 * @param {boolean} [props.disabled=false]
 * @param {boolean} [props.fullWidth=false]
 * @param {React.ReactNode} [props.leftIcon]
 * @param {React.ReactNode} [props.rightIcon]
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children
 */
const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    className,
    children,
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={clsx(
        // Base styles
        'inline-flex items-center justify-center',
        'font-semibold select-none cursor-pointer',
        'transition-all duration-150 ease-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-aura-500 focus-visible:ring-offset-2',
        'dark:focus-visible:ring-offset-navy-900',

        // Size
        sizes[size],

        // Variant
        variants[variant],

        // Width
        fullWidth && 'w-full',

        // Disabled state
        isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',

        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin h-4 w-4 shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span>{children}</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
});

export default Button;
