const Pagination = ({ page = 1, totalPages = 1, onPageChange }) => {
  if (totalPages <= 1) {
    return null;
  }

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).slice(
    Math.max(page - 3, 0),
    Math.max(page - 3, 0) + 5
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Previous
      </button>

      {pages.map((pageNumber) => (
        <button
          key={pageNumber}
          type="button"
          onClick={() => onPageChange(pageNumber)}
          className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
            pageNumber === page
              ? 'bg-emerald-600 text-white'
              : 'border border-stone-300 text-stone-700 hover:bg-stone-50'
          }`}
        >
          {pageNumber}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;
