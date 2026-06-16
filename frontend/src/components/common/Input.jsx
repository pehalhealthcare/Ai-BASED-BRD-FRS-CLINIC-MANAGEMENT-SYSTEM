const Input = ({ className = '', ...props }) => (
  <input
    className={`w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 ${className}`}
    {...props}
  />
);

export default Input;
