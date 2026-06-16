const LoadingState = ({ label = 'Loading workspace status...' }) => {
  return (
    <div className="rounded-3xl border border-amber-200 bg-amber-50 px-6 py-5 text-sm font-medium text-amber-900">
      {label}
    </div>
  );
};

export default LoadingState;
