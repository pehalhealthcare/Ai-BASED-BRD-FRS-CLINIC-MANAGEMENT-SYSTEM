const toneClasses = {
  neutral: 'bg-stone-100 text-stone-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-rose-100 text-rose-700',
  info: 'bg-sky-100 text-sky-700'
};

const Badge = ({ children, tone = 'neutral', className = '' }) => (
  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${toneClasses[tone] || toneClasses.neutral} ${className}`}>
    {children}
  </span>
);

export default Badge;
