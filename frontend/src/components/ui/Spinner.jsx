import { clsx } from 'clsx';

/**
 * Spinner — branded animated loading spinner.
 *
 * @param {'sm'|'md'|'lg'|'xl'} [size='md']
 * @param {string} [className]
 * @param {string} [label='Loading...']
 */
const Spinner = ({ size = 'md', className, label = 'Loading...' }) => {
  const sizeMap = {
    sm:  'w-4 h-4 border-2',
    md:  'w-6 h-6 border-2',
    lg:  'w-8 h-8 border-[3px]',
    xl:  'w-12 h-12 border-4',
  };

  return (
    <span
      role="status"
      aria-label={label}
      className={clsx('inline-flex', className)}
    >
      <span
        className={clsx(
          'rounded-full animate-spin',
          'border-slate-200 dark:border-slate-700',
          'border-t-aura-600 dark:border-t-aura-400',
          sizeMap[size]
        )}
      />
    </span>
  );
};

/**
 * FullPageSpinner — centered spinner for page-level loading states.
 */
export const FullPageSpinner = ({ message }) => (
  <div className="flex flex-col items-center justify-center min-h-64 gap-4">
    <Spinner size="xl" />
    {message && <p className="text-sm text-slate-500 dark:text-slate-400 animate-pulse">{message}</p>}
  </div>
);

export default Spinner;
