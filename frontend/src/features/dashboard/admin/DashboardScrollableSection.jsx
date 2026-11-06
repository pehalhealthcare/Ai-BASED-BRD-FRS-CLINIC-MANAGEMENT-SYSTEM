import React from 'react';

/**
 * Reusable DashboardScrollableSection Component
 * Provides fixed header, optional filter/subheader area, and bounded scrollable content container
 */
const DashboardScrollableSection = ({
  title,
  subtitle,
  badge,
  action,
  headerChildren,
  loading = false,
  loadingComponent,
  isEmpty = false,
  emptyComponent,
  emptyTitle = 'No data available',
  emptySubtitle,
  emptyIcon,
  className = '',
  contentClassName = '',
  scrollDirection = 'vertical', // 'vertical' | 'horizontal'
  scrollRef,
  onScroll,
  footer,
  children
}) => {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col ${className}`}>
      {/* Fixed Header */}
      {(title || action || badge) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {typeof title === 'string' ? (
              <h2 className="text-sm font-black text-slate-900 truncate">{title}</h2>
            ) : (
              title
            )}
            {subtitle && (
              <span className="text-xs text-slate-400 font-medium ml-1 truncate">{subtitle}</span>
            )}
            {badge}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      {/* Optional Fixed Filters / Subheader */}
      {headerChildren && <div className="shrink-0">{headerChildren}</div>}

      {/* Content Area */}
      {loading ? (
        <div className="flex-1 min-h-0 p-4">
          {loadingComponent || (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-slate-50 rounded-xl animate-pulse" />
              ))}
            </div>
          )}
        </div>
      ) : isEmpty ? (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center py-10 px-4 text-center">
          {emptyComponent || (
            <>
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 mb-3 shrink-0">
                {emptyIcon || (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" strokeWidth="2" />
                    <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" />
                    <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2" />
                  </svg>
                )}
              </div>
              <p className="text-xs font-bold text-slate-500">{emptyTitle}</p>
              {emptySubtitle && (
                <p className="text-[10px] text-slate-400 mt-0.5">{emptySubtitle}</p>
              )}
            </>
          )}
        </div>
      ) : (
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className={`flex-1 min-h-0 ${
            scrollDirection === 'horizontal'
              ? 'overflow-x-auto overflow-y-hidden'
              : 'overflow-y-auto'
          } dashboard-custom-scroll ${contentClassName}`}
        >
          {children}
        </div>
      )}

      {/* Optional Fixed Footer */}
      {footer && <div className="shrink-0">{footer}</div>}
    </div>
  );
};

export default DashboardScrollableSection;

