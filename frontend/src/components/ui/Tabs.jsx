import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';

/**
 * Tabs — animated pill/underline tab navigation bar.
 *
 * @param {object} props
 * @param {Array<{id: string, label: string, icon?: React.ReactNode, badge?: string|number}>} props.tabs
 * @param {string} props.activeTab
 * @param {(id: string) => void} props.onChange
 * @param {'pill'|'underline'|'card'} [props.variant='pill']
 * @param {string} [props.className]
 */
const Tabs = ({ tabs, activeTab, onChange, variant = 'pill', className }) => {
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef({});

  useEffect(() => {
    const el = tabRefs.current[activeTab];
    if (el) {
      setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [activeTab, tabs]);

  if (variant === 'underline') {
    return (
      <div className={clsx('relative flex gap-0 border-b border-slate-200 dark:border-white/10', className)}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={(el) => { if (el) tabRefs.current[tab.id] = el; }}
            onClick={() => onChange(tab.id)}
            className={clsx(
              'relative px-4 py-3 text-sm font-medium transition-colors duration-150 whitespace-nowrap',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-aura-500 rounded-t-lg',
              activeTab === tab.id
                ? 'text-aura-600 dark:text-aura-400'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            <span className="flex items-center gap-2">
              {tab.icon && <span>{tab.icon}</span>}
              {tab.label}
              {tab.badge !== undefined && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-aura-100 text-aura-700 dark:bg-aura-500/20 dark:text-aura-300">
                  {tab.badge}
                </span>
              )}
            </span>
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-aura-500 dark:bg-aura-400 rounded-t-full" />
            )}
          </button>
        ))}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={clsx('flex gap-1 p-1 bg-slate-100 dark:bg-navy-700/50 rounded-xl', className)}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-aura-500',
              activeTab === tab.id
                ? 'bg-white dark:bg-navy-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span className="whitespace-nowrap">{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-aura-100 text-aura-700 dark:bg-aura-500/20 dark:text-aura-300">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  // Pill variant (default) with sliding indicator
  return (
    <div className={clsx('relative flex gap-1', className)}>
      {/* Animated sliding pill */}
      <div
        className="absolute top-0 bottom-0 rounded-xl bg-aura-600 dark:bg-aura-500 transition-all duration-200 ease-spring pointer-events-none"
        style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
      />

      {tabs.map((tab) => (
        <button
          key={tab.id}
          ref={(el) => { if (el) tabRefs.current[tab.id] = el; }}
          onClick={() => onChange(tab.id)}
          className={clsx(
            'relative z-10 flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl',
            'transition-colors duration-150',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-aura-500',
            activeTab === tab.id
              ? 'text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          )}
        >
          {tab.icon && <span className="shrink-0">{tab.icon}</span>}
          <span className="whitespace-nowrap">{tab.label}</span>
          {tab.badge !== undefined && (
            <span className={clsx(
              'px-1.5 py-0.5 text-[10px] font-semibold rounded-full',
              activeTab === tab.id
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
            )}>
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export default Tabs;
