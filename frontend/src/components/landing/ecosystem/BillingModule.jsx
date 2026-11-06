import React, { useState, useMemo } from 'react';
import { 
  Search, Plus, MoreHorizontal, IndianRupee, CheckCircle2, 
  Clock, AlertCircle, Calendar, Printer, QrCode, X, 
  FileText, ArrowDownRight, CreditCard, ChevronDown, BarChart3,
  Building2, ShieldCheck, Check
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function BillingModule({ data, onUpdateData }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [serviceFilter, setServiceFilter] = useState('All Services');
  const [dateRange, setDateRange] = useState(data.dateRange || '01 Sep 2026 - 30 Sep 2026');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(null); // holds invoice
  const [showPreviewModal, setShowPreviewModal] = useState(null); // holds invoice
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Forms
  const [invoiceForm, setInvoiceForm] = useState({
    patientId: 'P001242',
    patientName: 'Kavita Menon',
    service: 'Consultation',
    serviceDesc: 'Specialist Follow-up Consultation',
    amount: 900,
    paidAmount: 900,
    paymentMethod: 'UPI Instant',
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    method: 'UPI Instant',
    reference: 'UPI/REF/9901',
  });

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return (data?.invoices || []).filter((inv) => {
      const matchesSearch = 
        inv.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.patient.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.patientName && inv.patientName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = 
        statusFilter === 'All Status' || inv.status === statusFilter;

      const matchesService = 
        serviceFilter === 'All Services' || inv.services === serviceFilter;

      return matchesSearch && matchesStatus && matchesService;
    });
  }, [data?.invoices, searchQuery, statusFilter, serviceFilter]);

  // Status Badge Helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Paid':
        return 'text-emerald-700 bg-emerald-50 border border-emerald-200';
      case 'Partially Paid':
        return 'text-amber-700 bg-amber-50 border border-amber-200';
      case 'Pending':
        return 'text-rose-700 bg-rose-50 border border-rose-200';
      default:
        return 'text-slate-700 bg-slate-50 border border-slate-200';
    }
  };

  // 1. CREATE DEMO INVOICE
  const handleCreateInvoice = (e) => {
    e.preventDefault();
    const totalAmt = parseInt(invoiceForm.amount, 10) || 0;
    const paidAmt = Math.min(totalAmt, parseInt(invoiceForm.paidAmount, 10) || 0);
    const balanceAmt = Math.max(0, totalAmt - paidAmt);

    let status = 'Pending';
    if (balanceAmt === 0) status = 'Paid';
    else if (paidAmt > 0) status = 'Partially Paid';

    const invNum = `INV-2026-00${(data.invoices?.length || 0) + 1}`;
    const newInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNo: invNum,
      patient: invoiceForm.patientId || `P00${Math.floor(1240 + Math.random() * 50)}`,
      patientName: invoiceForm.patientName || 'Patient',
      date: 'Today, 29 Sep 2026',
      services: invoiceForm.service || 'Consultation',
      items: [
        { desc: invoiceForm.serviceDesc || `${invoiceForm.service} Clinical Charge`, qty: 1, rate: totalAmt, amount: totalAmt },
      ],
      total: totalAmt,
      paid: paidAmt,
      balance: balanceAmt,
      status: status,
      method: paidAmt > 0 ? invoiceForm.paymentMethod : 'Pending Settlement',
    };

    const nextInvoices = [newInvoice, ...(data.invoices || [])];
    const nextStats = {
      ...data.stats,
      totalRevenue: (data.stats?.totalRevenue || 1248320) + totalAmt,
      paymentsReceived: (data.stats?.paymentsReceived || 972450) + paidAmt,
      outstanding: (data.stats?.outstanding || 275870) + balanceAmt,
      pendingInvoices: status !== 'Paid' ? (data.stats?.pendingInvoices || 24) + 1 : data.stats?.pendingInvoices,
    };

    onUpdateData({ ...data, invoices: nextInvoices, stats: nextStats });
    setShowCreateModal(false);
    setInvoiceForm({
      patientId: 'P001242',
      patientName: 'Kavita Menon',
      service: 'Consultation',
      serviceDesc: 'Specialist Follow-up Consultation',
      amount: 900,
      paidAmount: 900,
      paymentMethod: 'UPI Instant',
    });
    toast.success(`Invoice ${invNum} for ₹${totalAmt.toLocaleString()} created!`);
  };

  // 2. RECORD DEMO PAYMENT
  const handleRecordPayment = (e) => {
    e.preventDefault();
    if (!showPaymentModal) return;

    const payAmt = parseInt(paymentForm.amount, 10) || 0;
    if (payAmt <= 0) {
      toast.error('Payment amount must be greater than 0');
      return;
    }
    if (payAmt > showPaymentModal.balance) {
      toast.error(`Payment cannot exceed outstanding balance (₹${showPaymentModal.balance.toLocaleString()})`);
      return;
    }

    const newPaid = showPaymentModal.paid + payAmt;
    const newBalance = showPaymentModal.balance - payAmt;
    const newStatus = newBalance === 0 ? 'Paid' : 'Partially Paid';

    const nextInvoices = data.invoices.map((inv) => {
      if (inv.id === showPaymentModal.id) {
        return {
          ...inv,
          paid: newPaid,
          balance: newBalance,
          status: newStatus,
          method: paymentForm.method,
        };
      }
      return inv;
    });

    const pendingDelta = showPaymentModal.status !== 'Paid' && newStatus === 'Paid' ? -1 : 0;
    const nextStats = {
      ...data.stats,
      paymentsReceived: (data.stats?.paymentsReceived || 972450) + payAmt,
      outstanding: Math.max(0, (data.stats?.outstanding || 275870) - payAmt),
      pendingInvoices: Math.max(0, (data.stats?.pendingInvoices || 24) + pendingDelta),
    };

    onUpdateData({ ...data, invoices: nextInvoices, stats: nextStats });
    toast.success(`Received ₹${payAmt.toLocaleString()} via ${paymentForm.method} for ${showPaymentModal.invoiceNo}`);
    setShowPaymentModal(null);
  };

  return (
    <div className="space-y-4">
      {/* Top Bar with Live Tag & Date Range */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
        <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
          Billing & Accounts
        </span>
        
        {/* Date Filter Pill matching screenshot */}
        <div className="relative">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full bg-white border border-slate-200/90 text-slate-700 shadow-xs hover:bg-slate-50 transition cursor-pointer"
          >
            <Calendar size={13} className="text-slate-400" />
            <span>{dateRange}</span>
            <ChevronDown size={11} className="text-slate-400 ml-0.5" />
          </button>

          {showDatePicker && (
            <div 
              className="absolute right-0 top-8 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-xs"
              onMouseLeave={() => setShowDatePicker(false)}
            >
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase">Billing Period</div>
              {[
                '01 Sep 2026 - 30 Sep 2026',
                '01 Aug 2026 - 31 Aug 2026',
                'Last 30 Days (Rolling)',
                'Current Financial Quarter (Q2 2026)',
              ].map((range) => (
                <button
                  key={range}
                  onClick={() => {
                    setDateRange(range);
                    setShowDatePicker(false);
                    toast.success(`Date period set to: ${range}`);
                  }}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-blue-50 transition cursor-pointer ${
                    dateRange === range ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-slate-700'
                  }`}
                >
                  <span>{range}</span>
                  {dateRange === range && <Check size={12} className="text-blue-600" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4 Mini Stat Blocks */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Total Revenue */}
        <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500">Total Revenue</span>
            <IndianRupee size={13} className="text-blue-500" />
          </div>
          <span className="text-base sm:text-lg font-black text-slate-900 mt-1">
            ₹{data.stats?.totalRevenue?.toLocaleString('en-IN') || '12,48,320'}
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded w-fit mt-1 text-blue-700 bg-blue-50 border border-blue-200/70">
            This Month
          </span>
        </div>

        {/* Payments Received */}
        <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500">Payments Received</span>
            <CheckCircle2 size={13} className="text-emerald-500" />
          </div>
          <span className="text-base sm:text-lg font-black text-slate-900 mt-1">
            ₹{data.stats?.paymentsReceived?.toLocaleString('en-IN') || '9,72,450'}
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded w-fit mt-1 text-emerald-700 bg-emerald-50 border border-emerald-200/70">
            Collected
          </span>
        </div>

        {/* Outstanding */}
        <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500">Outstanding</span>
            <AlertCircle size={13} className="text-amber-500" />
          </div>
          <span className="text-base sm:text-lg font-black text-slate-900 mt-1">
            ₹{data.stats?.outstanding?.toLocaleString('en-IN') || '2,75,870'}
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded w-fit mt-1 text-amber-700 bg-amber-50 border border-amber-200/70">
            Pending
          </span>
        </div>

        {/* Pending Invoices */}
        <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500">Pending Invoices</span>
            <Clock size={13} className="text-rose-500" />
          </div>
          <span className="text-base sm:text-lg font-black text-slate-900 mt-1">
            {data.stats?.pendingInvoices?.toLocaleString() || '24'}
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded w-fit mt-1 text-rose-700 bg-rose-50 border border-rose-200/70">
            Need Follow-up
          </span>
        </div>
      </div>

      {/* Search, Filters & Action Button Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search invoice no. or patient name..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200/90 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-slate-200/90 rounded-lg text-xs font-medium text-slate-700 py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="All Status">All Status</option>
          <option value="Paid">Paid</option>
          <option value="Partially Paid">Partially Paid</option>
          <option value="Pending">Pending</option>
        </select>

        {/* Services Filter */}
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="bg-white border border-slate-200/90 rounded-lg text-xs font-medium text-slate-700 py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="All Services">All Services</option>
          <option value="Consultation">Consultation</option>
          <option value="Lab Tests">Lab Tests</option>
          <option value="Medicine">Medicine</option>
          <option value="Procedure">Procedure</option>
        </select>

        {/* Create Invoice Action */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3.5 py-1.5 text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          <Plus size={14} />
          <span>Create Invoice</span>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-xs">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold">
            <tr>
              <th className="py-2.5 px-3">Invoice No.</th>
              <th className="py-2.5 px-3">Patient</th>
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Services</th>
              <th className="py-2.5 px-3">Total</th>
              <th className="py-2.5 px-3">Paid</th>
              <th className="py-2.5 px-3">Balance</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400">
                  No invoices match your search or filter.
                </td>
              </tr>
            ) : (
              filteredInvoices.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="py-2.5 px-3 font-bold text-blue-600 font-mono text-[10px]">
                    {row.invoiceNo}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    <div>{row.patient}</div>
                    {row.patientName && (
                      <div className="text-[10px] text-slate-400 font-normal">{row.patientName}</div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                    {row.date}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 font-medium">
                    {row.services}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">
                    ₹{row.total.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-emerald-600">
                    ₹{row.paid.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">
                    ₹{row.balance.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${getStatusBadge(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right relative">
                    <div className="inline-block text-left">
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === row.id ? null : row.id)}
                        className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                        title="Actions"
                      >
                        <MoreHorizontal size={14} />
                      </button>

                      {/* Dropdown Menu */}
                      {activeMenuId === row.id && (
                        <div 
                          className="absolute right-3 top-8 w-44 bg-white rounded-lg shadow-lg border border-slate-200/90 py-1 z-30 text-left text-xs"
                          onMouseLeave={() => setActiveMenuId(null)}
                        >
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              setShowPreviewModal(row);
                            }}
                            className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-blue-50 hover:text-blue-600 transition cursor-pointer"
                          >
                            <FileText size={13} className="text-blue-500" />
                            <span>Preview Invoice</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              setShowPaymentModal(row);
                              setPaymentForm({
                                amount: row.balance,
                                method: 'UPI Instant',
                                reference: `UPI/REF/${Math.floor(1000 + Math.random() * 9000)}`,
                              });
                            }}
                            disabled={row.balance <= 0}
                            className={`w-full px-3 py-1.5 flex items-center gap-2 hover:bg-emerald-50 hover:text-emerald-700 transition ${
                              row.balance <= 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                            }`}
                          >
                            <CreditCard size={13} className="text-emerald-500" />
                            <span>Record Payment</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Analytics Overview Trigger */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => setShowAnalyticsModal(true)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
        >
          <BarChart3 size={13} />
          <span>View Revenue Breakdown & Payment Methods</span>
        </button>
      </div>

      {/* ── MODAL 1: CREATE DEMO INVOICE ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <IndianRupee size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Create Demo Invoice</h4>
                  <p className="text-[11px] text-slate-500">Issue patient invoice & record collections</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Patient ID</label>
                  <input
                    type="text"
                    value={invoiceForm.patientId}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, patientId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Patient Name</label>
                  <input
                    type="text"
                    value={invoiceForm.patientName}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, patientName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Primary Service</label>
                  <select
                    value={invoiceForm.service}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, service: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Consultation">Consultation</option>
                    <option value="Lab Tests">Lab Tests</option>
                    <option value="Medicine">Medicine</option>
                    <option value="Procedure">Procedure</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Total Bill (₹)</label>
                  <input
                    type="number"
                    min="100"
                    value={invoiceForm.amount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Service Description</label>
                <input
                  type="text"
                  value={invoiceForm.serviceDesc}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, serviceDesc: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount Paid Now (₹)</label>
                  <input
                    type="number"
                    min="0"
                    max={invoiceForm.amount}
                    value={invoiceForm.paidAmount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, paidAmount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={invoiceForm.paymentMethod}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="UPI Instant">UPI Instant</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between font-bold">
                <span className="text-slate-500">Calculated Balance Due:</span>
                <span className="text-slate-900 text-sm">
                  ₹{Math.max(0, (parseInt(invoiceForm.amount, 10) || 0) - (parseInt(invoiceForm.paidAmount, 10) || 0)).toLocaleString()}
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs transition"
                >
                  Generate Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: RECORD PAYMENT ── */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CreditCard size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Record Demo Payment</h4>
                  <p className="text-[11px] text-slate-500">{showPaymentModal.invoiceNo} • {showPaymentModal.patient}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPaymentModal(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-5 space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Bill</span>
                  <p className="font-bold text-slate-800">₹{showPaymentModal.total.toLocaleString()}</p>
                  <p className="text-[10px] text-emerald-600 font-medium">Already Paid: ₹{showPaymentModal.paid.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Balance Due</span>
                  <p className="text-base font-black text-rose-600">₹{showPaymentModal.balance.toLocaleString()}</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Payment Amount (₹)</label>
                  <button
                    type="button"
                    onClick={() => setPaymentForm({ ...paymentForm, amount: showPaymentModal.balance })}
                    className="text-[10px] text-blue-600 hover:underline font-bold"
                  >
                    Pay Full Balance
                  </button>
                </div>
                <input
                  type="number"
                  min="1"
                  max={showPaymentModal.balance}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-black text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="UPI Instant">UPI Instant</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Transaction Ref.</label>
                  <input
                    type="text"
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs transition"
                >
                  Record Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: INVOICE PREVIEW / RECEIPT ── */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Clinic Tax Invoice & Receipt</h4>
                  <p className="text-[11px] text-slate-500">{showPreviewModal.invoiceNo} • GST Compliant</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    toast.success('Printing invoice receipt...');
                    window.print();
                  }}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white hover:text-blue-600 transition inline-flex items-center gap-1 text-xs font-semibold"
                >
                  <Printer size={13} />
                  <span>Print</span>
                </button>
                <button 
                  onClick={() => setShowPreviewModal(null)}
                  className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Receipt Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-800">
              {/* Clinic Banner */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-black text-blue-600">PEHAL HEALTHCARE CLINIC</h3>
                  <p className="text-[11px] text-slate-500">GSTIN: 29AABCU9603R1ZM • Reg: CL-KA-2026-880</p>
                  <p className="text-[11px] text-slate-500">Indiranagar Care Hub, Bengaluru | +91 80 4123 4567</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-slate-900 block">{showPreviewModal.invoiceNo}</span>
                  <span className="text-[11px] text-slate-500">{showPreviewModal.date}</span>
                </div>
              </div>

              {/* Patient Details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Patient Identifier</span>
                  <p className="font-bold text-slate-900">{showPreviewModal.patient}</p>
                  <p className="text-[10px] text-slate-500">{showPreviewModal.patientName || 'Registered Patient'}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Service Category</span>
                  <p className="font-bold text-slate-900">{showPreviewModal.services}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Payment Status</span>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold mt-0.5 ${getStatusBadge(showPreviewModal.status)}`}>
                    {showPreviewModal.status}
                  </span>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500">
                    <tr>
                      <th className="py-2 px-3">Item Description</th>
                      <th className="py-2 px-3">Qty</th>
                      <th className="py-2 px-3">Rate</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {(showPreviewModal.items || [
                      { desc: `${showPreviewModal.services} Professional Healthcare Fee`, qty: 1, rate: showPreviewModal.total, amount: showPreviewModal.total }
                    ]).map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-semibold text-slate-900">{item.desc}</td>
                        <td className="py-2 px-3 text-slate-600">{item.qty}</td>
                        <td className="py-2 px-3 text-slate-600">₹{item.rate.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">₹{item.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals & Calculations */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold">₹{showPreviewModal.total.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>GST (Exempted / Nil):</span>
                    <span className="font-semibold">₹0</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-1 text-slate-900 font-bold">
                    <span>Grand Total:</span>
                    <span>₹{showPreviewModal.total.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-600 font-bold">
                    <span>Amount Paid:</span>
                    <span>-₹{showPreviewModal.paid.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-1 text-rose-600 font-black text-xs">
                    <span>Balance Due:</span>
                    <span>₹{showPreviewModal.balance.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* QR and Verification */}
              <div className="flex items-center justify-between p-3 bg-blue-50/40 rounded-xl border border-blue-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white border border-slate-300 rounded-lg flex items-center justify-center p-1 shrink-0">
                    <QrCode size={34} className="text-slate-800" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-blue-700 uppercase">UPI Instant Reconciliation</span>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Settled via {showPreviewModal.method || 'Standard Method'} • Authenticated by AI-CMS Finance
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                  <ShieldCheck size={14} />
                  <span>Valid Receipt</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowPreviewModal(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold text-xs transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: FINANCIAL ANALYTICS ── */}
      {showAnalyticsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <BarChart3 size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Revenue Breakdown (Demo)</h4>
                  <p className="text-[11px] text-slate-500">Service categorization and collection health</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAnalyticsModal(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-800">Collection Rate</span>
                  <span className="font-black text-emerald-600">
                    {Math.round(((data.stats?.paymentsReceived || 972450) / (data.stats?.totalRevenue || 1248320)) * 100)}% Collected
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-2 rounded-full"
                    style={{ width: `${Math.round(((data.stats?.paymentsReceived || 972450) / (data.stats?.totalRevenue || 1248320)) * 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="space-y-2.5">
                <span className="text-[10px] uppercase font-bold text-slate-400">Revenue by Service Category</span>
                {[
                  { name: 'Consultations (OPD & Specialists)', share: '42%', amt: '₹5,24,290', color: 'bg-blue-600' },
                  { name: 'Diagnostic Pathology & Lab Tests', share: '31%', amt: '₹3,86,980', color: 'bg-purple-600' },
                  { name: 'Pharmacy Dispensations', share: '18%', amt: '₹2,24,700', color: 'bg-emerald-600' },
                  { name: 'Minor Procedures & Dressing', share: '9%', amt: '₹1,12,350', color: 'bg-amber-600' },
                ].map((item) => (
                  <div key={item.name} className="p-2.5 bg-slate-50 rounded-lg border border-slate-150 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${item.color}`}></div>
                      <span className="font-semibold text-slate-800">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-slate-900 block">{item.amt}</span>
                      <span className="text-[10px] text-slate-500">{item.share}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setShowAnalyticsModal(false)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
