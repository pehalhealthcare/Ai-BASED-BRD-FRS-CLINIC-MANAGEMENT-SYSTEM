import { clsx } from 'clsx';

const colorMap = {
  default:  'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300',
  success:  'bg-aura-50 text-aura-700 dark:bg-aura-500/15 dark:text-aura-300',
  warning:  'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  danger:   'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  info:     'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  accent:   'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  purple:   'bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
};

const dotColorMap = {
  default:  'bg-slate-400 dark:bg-slate-500',
  success:  'bg-aura-500 dark:bg-aura-400',
  warning:  'bg-amber-500 dark:bg-amber-400',
  danger:   'bg-rose-500 dark:bg-rose-400',
  info:     'bg-sky-500 dark:bg-sky-400',
  accent:   'bg-indigo-500 dark:bg-indigo-400',
  purple:   'bg-purple-500 dark:bg-purple-400',
};

/**
 * Badge — colored status badge with optional pulsing dot indicator.
 *
 * @param {object} props
 * @param {'default'|'success'|'warning'|'danger'|'info'|'accent'|'purple'} [props.color='default']
 * @param {'sm'|'md'} [props.size='md']
 * @param {boolean} [props.dot=false] - Show a colored dot prefix
 * @param {boolean} [props.pulse=false] - Pulse the dot
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children
 */
const Badge = ({ color = 'default', size = 'md', dot = false, pulse = false, className, children }) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        colorMap[color],
        className
      )}
    >
      {dot && (
        <span className="relative inline-flex">
          {pulse && (
            <span className={clsx('absolute inline-flex h-2 w-2 rounded-full opacity-60 animate-ping', dotColorMap[color])} />
          )}
          <span className={clsx('relative inline-flex h-2 w-2 rounded-full', dotColorMap[color])} />
        </span>
      )}
      {children}
    </span>
  );
};

export default Badge;
