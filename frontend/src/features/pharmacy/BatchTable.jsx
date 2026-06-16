import EmptyState from '../../components/common/EmptyState';
import StockFlagBadge from './StockFlagBadge';

const BatchTable = ({ batches = [] }) => {
  if (!batches.length) {
    return <EmptyState title="No batches yet" description="Add stock batches to begin dispensing this medicine safely." />;
  }

  return (
    <div className="grid gap-3">
      {batches.map((batch) => (
        <article key={batch._id || batch.batchNumber} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="font-semibold text-stone-900">{batch.batchNumber}</p>
              <p className="mt-1 text-sm text-stone-600">
                Qty: {batch.quantity ?? 0} | Expiry: {batch.expiryDate?.slice?.(0, 10) || batch.expiryDate || 'Not provided'}
              </p>
              <p className="mt-1 text-sm text-stone-600">
                Purchase: INR {Number(batch.purchasePrice || 0).toFixed(2)} | Selling: INR {Number(batch.sellingPrice || 0).toFixed(2)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {batch.isExpired ? <StockFlagBadge flag="expired" /> : null}
              {batch.isNearExpiry && !batch.isExpired ? <StockFlagBadge flag="nearExpiry" /> : null}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
};

export default BatchTable;
