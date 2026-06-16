const NoDataState = ({ title, description }) => (
  <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 px-6 py-8 text-center">
    <h3 className="text-lg font-semibold text-stone-900">{title}</h3>
    <p className="mt-2 text-sm text-stone-600">{description}</p>
  </div>
);

export default NoDataState;
