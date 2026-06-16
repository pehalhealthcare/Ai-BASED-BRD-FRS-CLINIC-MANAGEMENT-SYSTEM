import EmptyState from './EmptyState';

const DataTable = ({ columns, rows, keyField = '_id', emptyTitle = 'No records found', emptyDescription = 'Try adjusting your filters.' }) => {
  if (!rows?.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-lg shadow-stone-200/40">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-stone-200">
          <thead className="bg-stone-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-stone-500"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((row) => (
              <tr key={row[keyField]} className="align-top">
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-4 text-sm text-stone-700">
                    {column.render ? column.render(row) : row[column.key] ?? 'Not provided'}
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

export default DataTable;
