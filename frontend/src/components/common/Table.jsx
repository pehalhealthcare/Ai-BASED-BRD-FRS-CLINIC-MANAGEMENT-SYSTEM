const Table = ({ columns = [], rows = [], emptyState = null }) => {
  if (!rows.length && emptyState) {
    return emptyState;
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-lg shadow-stone-200/40">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-stone-200">
          <thead className="bg-stone-50">
            <tr className="text-left text-xs uppercase tracking-[0.18em] text-stone-500">
              {columns.map((column) => (
                <th key={column.key} className="px-6 py-4">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-sm text-stone-700">
            {rows.map((row, rowIndex) => (
              <tr key={row._id || row.id || rowIndex}>
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 align-top">
                    {typeof column.render === 'function' ? column.render(row) : row?.[column.key] ?? 'Not provided'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Table;
