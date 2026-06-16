const EmptyState = ({ title, description, action }) => {
  return (
    <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 p-6 text-stone-900">
      <h3 className="text-lg font-semibold text-stone-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>
      {action}
    </div>
  );
};

export default EmptyState;
