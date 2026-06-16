const cardConfig = [
  { key: 'totalRevenue', label: 'Total revenue' },
  { key: 'pendingAmount', label: 'Pending amount' },
  { key: 'paidInvoices', label: 'Paid invoices' },
  { key: 'unpaidInvoices', label: 'Unpaid invoices' },
  { key: 'todayRevenue', label: 'Today revenue' }
];

const formatCurrency = (value) => `INR ${Number(value || 0).toFixed(2)}`;

const BillingSummaryCards = ({ summary = {} }) => (
  <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
    {cardConfig.map((card) => (
      <article key={card.key} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-lg shadow-stone-200/40">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{card.label}</p>
        <p className="mt-3 text-2xl font-semibold text-stone-900">
          {card.key.includes('Revenue') || card.key.includes('Amount')
            ? formatCurrency(summary?.[card.key])
            : summary?.[card.key] ?? 0}
        </p>
      </article>
    ))}
  </div>
);

export default BillingSummaryCards;
