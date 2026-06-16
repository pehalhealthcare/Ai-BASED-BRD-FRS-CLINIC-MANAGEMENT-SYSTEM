const variantClasses = {
  primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
  secondary: 'border border-stone-300 bg-white text-stone-700 hover:bg-stone-50',
  ghost: 'text-stone-700 hover:bg-stone-100',
  danger: 'bg-rose-600 text-white hover:bg-rose-700'
};

const Button = ({ children, className = '', variant = 'primary', type = 'button', ...props }) => (
  <button
    type={type}
    className={`inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-600 ${variantClasses[variant] || variantClasses.primary} ${className}`}
    {...props}
  >
    {children}
  </button>
);

export default Button;
