import { useState } from 'react';

const FIELD_CLASS =
  'w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

const paymentModes = ['cash', 'upi', 'card', 'netbanking', 'insurance', 'wallet', 'other'];

const PaymentForm = ({ dueAmount = 0, onSubmit, loading = false, disabled = false }) => {
  const [form, setForm] = useState({
    amount: '',
    paymentMode: 'cash',
    transactionId: '',
    notes: ''
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit({
      ...form,
      amount: Number(form.amount)
    });
    setForm({
      amount: '',
      paymentMode: 'cash',
      transactionId: '',
      notes: ''
    });
  };

  return (
    <form className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40" onSubmit={handleSubmit}>
      <div>
        <h2 className="text-xl font-semibold text-stone-900">Record payment</h2>
        <p className="mt-1 text-sm text-stone-600">Due amount: INR {Number(dueAmount || 0).toFixed(2)}</p>
      </div>

      <label className="grid gap-2 text-sm font-medium text-stone-700">
        <span>Amount</span>
        <input
          className={FIELD_CLASS}
          type="number"
          min="0.01"
          max={dueAmount}
          step="0.01"
          value={form.amount}
          onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
          disabled={disabled || loading}
          required
        />
      </label>

      <label className="grid gap-2 text-sm font-medium text-stone-700">
        <span>Payment mode</span>
        <select
          className={FIELD_CLASS}
          value={form.paymentMode}
          onChange={(event) => setForm((current) => ({ ...current, paymentMode: event.target.value }))}
          disabled={disabled || loading}
        >
          {paymentModes.map((mode) => (
            <option key={mode} value={mode}>
              {mode.toUpperCase()}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2 text-sm font-medium text-stone-700">
        <span>Transaction ID</span>
        <input
          className={FIELD_CLASS}
          type="text"
          value={form.transactionId}
          onChange={(event) => setForm((current) => ({ ...current, transactionId: event.target.value }))}
          disabled={disabled || loading}
        />
      </label>

      <label className="grid gap-2 text-sm font-medium text-stone-700">
        <span>Notes</span>
        <textarea
          className={FIELD_CLASS}
          rows={3}
          value={form.notes}
          onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          disabled={disabled || loading}
        />
      </label>

      <button
        type="submit"
        disabled={disabled || loading}
        className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-stone-300"
      >
        {loading ? 'Recording...' : 'Record payment'}
      </button>
    </form>
  );
};

export default PaymentForm;
