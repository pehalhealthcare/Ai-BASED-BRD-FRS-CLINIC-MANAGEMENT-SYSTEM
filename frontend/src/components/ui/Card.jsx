import { clsx } from 'clsx';

/**
 * Card — glassmorphic surface card with variant and padding options.
 *
 * @param {object} props
 * @param {'elevated'|'outlined'|'ghost'|'glass'} [props.variant='elevated']
 * @param {'none'|'sm'|'md'|'lg'} [props.padding='md']
 * @param {boolean} [props.hover=false] - Add hover lift effect
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children
 */
const Card = ({
  variant = 'elevated',
  padding = 'md',
  hover = false,
  className,
  children,
  ...props
}) => {
  const paddingMap = {
    none: '',
    sm: 'p-4',
    md: 'p-5 md:p-6',
    lg: 'p-6 md:p-8',
  };

  return (
    <div
      className={clsx(
        'rounded-2xl',
        'transition-all duration-200',

        variant === 'elevated' && [
          'bg-white dark:bg-navy-800',
          'border border-slate-100 dark:border-white/[0.06]',
          'shadow-card dark:shadow-card-dark',
        ],

        variant === 'outlined' && [
          'bg-white dark:bg-navy-800',
          'border border-slate-200 dark:border-white/10',
        ],

        variant === 'ghost' && [
          'bg-slate-50 dark:bg-white/[0.04]',
          'border border-transparent',
        ],

        variant === 'glass' && [
          'glass dark:glass-dark',
        ],

        hover && [
          'cursor-pointer',
          'hover:-translate-y-0.5 hover:shadow-elevated dark:hover:shadow-elevated-dark',
        ],

        paddingMap[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * Card.Header — titled header section within a Card.
 */
Card.Header = function CardHeader({ title, subtitle, action, className }) {
  return (
    <div className={clsx('flex items-start justify-between gap-4', className)}>
      <div>
        {title && <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>}
        {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

export default Card;
