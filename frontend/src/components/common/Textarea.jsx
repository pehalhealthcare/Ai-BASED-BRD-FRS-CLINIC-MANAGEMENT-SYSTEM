const Textarea = ({ className = '', ...props }) => (
  <textarea
    className={`w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${className}`}
    {...props}
  />
);

export default Textarea;
