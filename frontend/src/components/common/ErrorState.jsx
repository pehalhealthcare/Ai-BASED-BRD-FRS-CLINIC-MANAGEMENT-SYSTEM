const ErrorState = ({ title = 'Something went wrong', description = 'Please try again.', action = null }) => {
  return (
    <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-rose-800">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
};

export default ErrorState;
