const FIELD_CLASS =
  'w-full rounded-2xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-white';

const itemTypes = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'lab', label: 'Lab' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'other', label: 'Other' }
];

const formatCurrency = (value) => `INR ${Number(value || 0).toFixed(2)}`;

const InvoiceItemsTable = ({
  items = [],
  editable = true,
  onItemChange,
  onAddItem,
  onRemoveItem
}) => (
  <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h2 className="text-xl font-semibold text-stone-900">Invoice items</h2>
        <p className="mt-1 text-sm text-stone-600">Use placeholder item types for future lab or pharmacy billing until those modules are implemented.</p>
      </div>
      {editable ? (
        <button
          type="button"
          onClick={onAddItem}
          className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
        >
          Add item
        </button>
      ) : null}
    </div>

    <div className="mt-6 grid gap-4">
      {items.map((item, index) => (
        <div key={`invoice-item-${index}`} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Type</span>
              <select
                className={FIELD_CLASS}
                value={item.itemType}
                onChange={(event) => onItemChange(index, 'itemType', event.target.value)}
                disabled={!editable}
              >
                {itemTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Name</span>
              <input
                className={FIELD_CLASS}
                type="text"
                value={item.name}
                onChange={(event) => onItemChange(index, 'name', event.target.value)}
                disabled={!editable}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Description</span>
              <input
                className={FIELD_CLASS}
                type="text"
                value={item.description}
                onChange={(event) => onItemChange(index, 'description', event.target.value)}
                disabled={!editable}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Quantity</span>
              <input
                className={FIELD_CLASS}
                type="number"
                min="1"
                value={item.quantity}
                onChange={(event) => onItemChange(index, 'quantity', event.target.value)}
                disabled={!editable}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Unit price</span>
              <input
                className={FIELD_CLASS}
                type="number"
                min="0"
                step="0.01"
                value={item.unitPrice}
                onChange={(event) => onItemChange(index, 'unitPrice', event.target.value)}
                disabled={!editable}
              />
            </label>

            <div className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Amount</span>
              <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-900">
                {formatCurrency((Number(item.quantity || 0) || 0) * (Number(item.unitPrice || 0) || 0))}
              </div>
            </div>
          </div>

          {editable ? (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => onRemoveItem(index)}
                className="rounded-2xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
              >
                Remove
              </button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  </div>
);

export default InvoiceItemsTable;
