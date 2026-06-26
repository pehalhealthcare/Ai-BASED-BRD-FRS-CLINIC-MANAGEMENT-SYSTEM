import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield, CreditCard, CheckCircle2, TrendingUp, FileText,
  Download, Plus, MoreVertical, ChevronRight, Lock,
  AlertTriangle, Phone, Headphones
} from 'lucide-react';
import { InputRow } from './SharedComponents';

export default function BillingInsurance({
  profile,
  insuranceForm, setInsuranceForm,
  newCardForm, setNewCardForm,
  paymentMethods,
  savingBilling,
  billingSuccessMessage,
  handleSaveInsurance,
  handleAddCard,
  handleRemoveCard,
  invoices,
  payments = [],
  handleDownloadInvoice,
}) {
  const navigate = useNavigate();
  const [billingSubTab, setBillingSubTab] = useState('overview');
  const [showAddCard, setShowAddCard] = useState(false);

  // Derived billing stats
  const totalBilled = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  const totalPaid = invoices.filter(inv => inv.paymentStatus === 'paid').reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  const totalUnpaid = invoices.filter(inv => inv.paymentStatus !== 'paid').reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  const unpaidInvoices = invoices.filter(inv => inv.paymentStatus !== 'paid');

  // Insurance coverage details from actual patient profile
  const coverageLimit = profile?.insuranceDetails?.coverageAmount || 0;
  const remainingCoverage = profile?.insuranceDetails?.remainingCoverage || 0;
  const coveragePercent = coverageLimit > 0 ? Math.round((remainingCoverage / coverageLimit) * 100) : 0;

  const hasInsurance = profile?.insuranceDetails?.coverageAmount > 0;
  const totalCovered = hasInsurance ? Math.min(totalUnpaid * 0.8, remainingCoverage) : 0;
  const patientPayable = totalUnpaid - totalCovered;
  const actualReductionPercent = totalUnpaid > 0 ? Math.round((totalCovered / totalUnpaid) * 100) : 0;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'insurance', label: 'Insurance Details' },
    { id: 'history', label: 'Billing History' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'payment', label: 'Payment Methods' },
  ];

  return (
    <div className="w-full space-y-5">
      {/* Top Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Due */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-5">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Amount Due</p>
          <p className="text-3xl font-black text-rose-500 mt-1">₹{totalUnpaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          {unpaidInvoices.length > 0 && (
            <p className="text-[11px] text-slate-400 mt-1">Due on {new Date(unpaidInvoices[0]?.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          )}
        </div>

        {/* Insurance Coverage */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-5 flex items-center gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Insurance Coverage</p>
            <p className="text-3xl font-black text-emerald-500 mt-1">{coverageLimit > 0 ? `${coveragePercent}%` : '0%'}</p>
            <p className="text-[11px] text-slate-400 mt-1">{insuranceForm.provider || 'No insurance linked'}</p>
          </div>
          <div className="ml-auto w-14 h-14 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center shrink-0">
            <Shield size={24} className="text-emerald-500" />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-5">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">Quick Actions</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                label: 'Make Payment',
                icon: <CreditCard size={16} />,
                color: 'text-aura-500',
                bg: 'bg-aura-500/10',
                onClick: () => {
                  if (unpaidInvoices.length > 0) {
                    navigate('/billing/all/checkout');
                  } else {
                    setBillingSubTab('payment');
                  }
                }
              },
              { label: 'Payment History', icon: <TrendingUp size={16} />, color: 'text-indigo-500', bg: 'bg-indigo-500/10', onClick: () => setBillingSubTab('history') },
              { label: 'Download Invoice', icon: <Download size={16} />, color: 'text-emerald-500', bg: 'bg-emerald-500/10', onClick: () => setBillingSubTab('invoices') },
            ].map(action => (
              <button key={action.label} onClick={action.onClick}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.04] transition group">
                <div className={`w-9 h-9 rounded-xl ${action.bg} flex items-center justify-center ${action.color} group-hover:scale-105 transition`}>
                  {action.icon}
                </div>
                <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 text-center leading-tight">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex overflow-x-auto border-b border-slate-200 dark:border-white/[0.08]">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setBillingSubTab(tab.id)}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all duration-150 whitespace-nowrap ${
              billingSubTab === tab.id
                ? 'border-aura-500 text-aura-500 dark:text-aura-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid xl:grid-cols-3 gap-5">

        {/* LEFT: Main Content */}
        <div className="xl:col-span-2 space-y-5">
          
          {/* Success Message */}
          {billingSuccessMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-sm font-medium animate-slide-down">
              <CheckCircle2 size={16} />{billingSuccessMessage}
            </div>
          )}

          {/* OVERVIEW TAB */}
          {billingSubTab === 'overview' && (
            <>
              {/* Insurance Summary Card */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Shield size={16} className="text-emerald-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Insurance Summary</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Provider</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">{insuranceForm.provider || '—'}</p>
                    <button onClick={() => setBillingSubTab('insurance')} className="text-[11px] text-aura-500 hover:underline mt-1 font-semibold">View Details</button>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Policy Number</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 font-mono">{insuranceForm.policyNumber || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Coverage</p>
                    <p className="text-sm font-bold text-emerald-500 mt-1">{coverageLimit > 0 ? `${coveragePercent}%` : '0%'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Remaining Coverage</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">₹{remainingCoverage.toLocaleString('en-IN')} / ₹{coverageLimit.toLocaleString('en-IN')}</p>
                    <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" style={{ width: `${coveragePercent}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Bills Table */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-amber-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Bills</h3>
                  </div>
                  <button onClick={() => setBillingSubTab('invoices')} className="text-xs font-semibold text-aura-500 hover:text-aura-600 transition">View All</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-white/5 text-slate-400 bg-slate-50 dark:bg-navy-900/40">
                        <th className="px-4 py-3 text-left font-semibold">Date</th>
                        <th className="px-4 py-3 text-left font-semibold">Description</th>
                        <th className="px-4 py-3 text-left font-semibold">Doctor / Department</th>
                        <th className="px-4 py-3 text-right font-semibold">Amount</th>
                        <th className="px-4 py-3 text-right font-semibold">Insurance Paid</th>
                        <th className="px-4 py-3 text-right font-semibold">You Paid</th>
                        <th className="px-4 py-3 text-center font-semibold">Status</th>
                        <th className="px-4 py-3 text-center font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-white/[0.04]">
                      {invoices.length > 0 ? invoices.slice(0, 5).map(inv => {
                        const isPaid = inv.paymentStatus === 'paid';
                        const total = inv.totalAmount || 0;
                        const insurancePaid = Math.round(total * (coveragePercent / 100));
                        const youPaid = total - insurancePaid;
                        return (
                          <tr key={inv._id} className="hover:bg-slate-50/50 dark:hover:bg-navy-900/20 transition">
                            <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </td>
                            <td className="px-4 py-3.5 font-medium text-slate-700 dark:text-slate-300 max-w-[140px] truncate">
                              {inv.description || inv.items?.[0]?.description || 'Medical Service'}
                            </td>
                            <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">
                              {inv.doctorName || inv.appointmentId?.doctorId?.fullName || 'AI-CMS'}
                            </td>
                            <td className="px-4 py-3.5 text-right font-semibold text-slate-800 dark:text-slate-200">₹{total.toLocaleString('en-IN')}</td>
                            <td className="px-4 py-3.5 text-right text-emerald-600 dark:text-emerald-400">₹{insurancePaid.toLocaleString('en-IN')}</td>
                            <td className="px-4 py-3.5 text-right text-slate-700 dark:text-slate-300">₹{youPaid.toLocaleString('en-IN')}</td>
                            <td className="px-4 py-3.5 text-center">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${isPaid ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                {isPaid ? 'Paid' : 'Unpaid'}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              {isPaid ? (
                                <button
                                  onClick={() => handleDownloadInvoice(inv._id)}
                                  className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center mx-auto hover:bg-slate-200 dark:hover:bg-white/10 transition"
                                  title="Download Invoice"
                                >
                                  <Download size={12} className="text-slate-500" />
                                </button>
                              ) : (
                                <Link to={`/billing/${inv._id}/checkout`} className="px-3 py-1.5 rounded-lg bg-aura-500 text-white text-[10px] font-bold hover:bg-aura-600 transition inline-block text-center">Pay Now</Link>
                              )}
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={8} className="px-4 py-10 text-center text-slate-400 text-sm">No invoices found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Billing Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total Billed', value: totalBilled, sub: 'All time', icon: <FileText size={20} />, color: 'text-aura-500', bg: 'bg-aura-500/10' },
                  { label: 'Insurance Paid', value: Math.round(totalPaid * (coveragePercent / 100)), sub: 'All time', icon: <Shield size={20} />, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                  { label: 'You Paid', value: totalPaid - Math.round(totalPaid * (coveragePercent / 100)), sub: 'All time', icon: <CreditCard size={20} />, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                  { label: 'Amount Due', value: totalUnpaid, sub: 'Due Now', icon: <AlertTriangle size={20} />, color: 'text-rose-500', bg: 'bg-rose-500/10' },
                ].map(card => (
                  <div key={card.label} className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-4">
                    <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center ${card.color} mb-3`}>
                      {card.icon}
                    </div>
                    <p className="text-xl font-extrabold text-slate-900 dark:text-white">₹{card.value.toLocaleString('en-IN')}</p>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-0.5">{card.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{card.sub}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* INSURANCE DETAILS TAB */}
          {billingSubTab === 'insurance' && (
            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-6 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/[0.06]">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center">
                  <Shield size={18} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">Insurance Details</h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Provide insurance details for claim automation.</p>
                </div>
              </div>

              {/* Info box for mock testing cards */}
              <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-xs text-indigo-400 space-y-2">
                <p className="font-bold text-indigo-600 dark:text-indigo-300">Available Mock Insurance Cards for Testing:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                    <p className="font-semibold text-slate-700 dark:text-slate-300">Star Health Insurance</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Policy: <span className="font-mono text-slate-800 dark:text-slate-200">STAR12345</span></p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Subscriber: <span className="font-semibold text-slate-800 dark:text-slate-200">Rahul Sharma</span></p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Group: <span className="font-mono text-slate-800 dark:text-slate-200">GRP1001</span></p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Coverage: <span className="font-semibold text-emerald-500">₹1,50,000</span></p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                    <p className="font-semibold text-slate-700 dark:text-slate-300">Niva Bupa Health Insurance</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Policy: <span className="font-mono text-slate-800 dark:text-slate-200">NIVA98765</span></p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Subscriber: <span className="font-semibold text-slate-800 dark:text-slate-200">Priya Patel</span></p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Group: <span className="font-mono text-slate-800 dark:text-slate-200">GRP1002</span></p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Coverage: <span className="font-semibold text-emerald-500">₹2,50,000</span></p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                    <p className="font-semibold text-slate-700 dark:text-slate-300">ICICI Lombard Insurance</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Policy: <span className="font-mono text-slate-800 dark:text-slate-200">ICICI55555</span></p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Subscriber: <span className="font-semibold text-slate-800 dark:text-slate-200">Amit Kumar</span></p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Group: <span className="font-mono text-slate-800 dark:text-slate-200">GRP1003</span></p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Coverage: <span className="font-semibold text-emerald-500">₹3,50,000</span></p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                    <p className="font-semibold text-slate-700 dark:text-slate-300">HDFC Ergo Insurance</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Policy: <span className="font-mono text-slate-800 dark:text-slate-200">HDFC44444</span></p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Subscriber: <span className="font-semibold text-slate-800 dark:text-slate-200">Siddharth Malhotra</span></p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Group: <span className="font-mono text-slate-800 dark:text-slate-200">GRP1004</span></p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Coverage: <span className="font-semibold text-emerald-500">₹5,00,000</span></p>
                  </div>
                </div>
              </div>
              <form onSubmit={handleSaveInsurance} className="space-y-4">
                <InputRow label="Insurance Provider" value={insuranceForm.provider} onChange={(e) => setInsuranceForm({ ...insuranceForm, provider: e.target.value })} placeholder="e.g. Star Health Insurance" />
                <div className="grid sm:grid-cols-2 gap-4">
                  <InputRow label="Policy Number" value={insuranceForm.policyNumber} onChange={(e) => setInsuranceForm({ ...insuranceForm, policyNumber: e.target.value })} placeholder="Policy #" />
                  <InputRow label="Group Number" value={insuranceForm.groupNumber} onChange={(e) => setInsuranceForm({ ...insuranceForm, groupNumber: e.target.value })} placeholder="Group #" />
                </div>
                <InputRow label="Subscriber Name" value={insuranceForm.subscriberName} onChange={(e) => setInsuranceForm({ ...insuranceForm, subscriberName: e.target.value })} placeholder="Name on card" />
                <InputRow label="Subscriber Date of Birth" type="date" value={insuranceForm.subscriberDob ? insuranceForm.subscriberDob.slice(0, 10) : ''} onChange={(e) => setInsuranceForm({ ...insuranceForm, subscriberDob: e.target.value })} />
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/8">
                  <input type="checkbox" id="autoClaimAutomation" checked={insuranceForm.autoClaimAutomation} onChange={(e) => setInsuranceForm({ ...insuranceForm, autoClaimAutomation: e.target.checked })} className="w-4 h-4 rounded text-aura-600 border-slate-300 focus:ring-aura-500" />
                  <label htmlFor="autoClaimAutomation" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">Enable Auto Insurance Claims Automation</label>
                </div>
                <div className="pt-2 flex justify-end">
                  <button type="submit" disabled={savingBilling} className="px-6 py-2.5 rounded-xl bg-aura-600 dark:bg-aura-500 text-white text-sm font-semibold hover:bg-aura-700 dark:hover:bg-aura-600 transition disabled:opacity-50">
                    {savingBilling ? 'Saving...' : 'Save Insurance'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* BILLING HISTORY / INVOICES TAB */}
          {/* BILLING HISTORY TAB */}
          {billingSubTab === 'history' && (
            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.06]">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Payment History</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/5 text-slate-400 bg-slate-50 dark:bg-navy-900/40">
                      <th className="px-4 py-3 text-left font-semibold">Transaction ID</th>
                      <th className="px-4 py-3 text-left font-semibold">Invoice #</th>
                      <th className="px-4 py-3 text-left font-semibold">Date</th>
                      <th className="px-4 py-3 text-right font-semibold">Amount</th>
                      <th className="px-4 py-3 text-center font-semibold">Method</th>
                      <th className="px-4 py-3 text-center font-semibold">Status</th>
                      <th className="px-4 py-3 text-center font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-white/[0.04]">
                    {payments.length > 0 ? payments.map(payment => (
                      <tr key={payment._id} className="hover:bg-slate-50/50 dark:hover:bg-navy-900/20 transition">
                        <td className="px-4 py-3.5 font-mono font-semibold text-slate-700 dark:text-slate-300">{payment.paymentId}</td>
                        <td className="px-4 py-3.5 font-mono text-slate-500 dark:text-slate-400">
                          {payment.invoiceId ? `#${payment.invoiceId.invoiceNumber || payment.invoiceId._id?.slice(-6)}` : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">
                          {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-slate-800 dark:text-slate-200">
                          ₹{(payment.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3.5 text-center text-slate-500 dark:text-slate-400 font-semibold">
                          {payment.method}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            payment.status === 'SUCCESS'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : payment.status === 'REFUNDED'
                              ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                              : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          }`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {payment.invoiceId?._id && (
                            <button
                              onClick={() => handleDownloadInvoice(payment.invoiceId._id)}
                              className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center mx-auto hover:bg-slate-200 dark:hover:bg-white/10 transition"
                              title="Download Invoice"
                            >
                              <Download size={12} className="text-slate-500" />
                            </button>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No payment history records found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ALL INVOICES TAB */}
          {billingSubTab === 'invoices' && (
            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.06]">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">All Invoices</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/5 text-slate-400 bg-slate-50 dark:bg-navy-900/40">
                      <th className="px-4 py-3 text-left font-semibold">Invoice #</th>
                      <th className="px-4 py-3 text-left font-semibold">Date</th>
                      <th className="px-4 py-3 text-right font-semibold">Amount</th>
                      <th className="px-4 py-3 text-center font-semibold">Status</th>
                      <th className="px-4 py-3 text-center font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-white/[0.04]">
                    {invoices.length > 0 ? invoices.map(inv => (
                      <tr key={inv._id} className="hover:bg-slate-50/50 dark:hover:bg-navy-900/20 transition">
                        <td className="px-4 py-3.5 font-mono font-semibold text-slate-700 dark:text-slate-300">#{inv.invoiceNumber || inv._id?.slice(-6)}</td>
                        <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">{inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—'}</td>
                        <td className="px-4 py-3.5 text-right font-bold text-slate-800 dark:text-slate-200">₹{(inv.totalAmount || 0).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${inv.paymentStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                            {inv.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            onClick={() => handleDownloadInvoice(inv._id)}
                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center mx-auto hover:bg-slate-200 dark:hover:bg-white/10 transition"
                            title="Download Invoice"
                          >
                            <Download size={12} className="text-slate-500" />
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No records found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PAYMENT METHODS TAB */}
          {billingSubTab === 'payment' && (
            <div className="space-y-4">
              {/* Saved Cards */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Payment Methods</h3>
                  <button onClick={() => setShowAddCard(!showAddCard)} className="flex items-center gap-1.5 text-xs font-semibold text-aura-500 hover:text-aura-600 transition">
                    <Plus size={14} /> Add New
                  </button>
                </div>
                <div className="space-y-3">
                  {paymentMethods.length > 0 ? paymentMethods.map((pm, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-navy-900/50">
                      <div className="w-12 h-8 rounded-lg bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center shrink-0">
                        <span className="text-[9px] font-black text-white tracking-wider">VISA</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">•••• {pm.cardNumber?.slice(-4) || '----'}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Expires {pm.expiryDate}</p>
                      </div>
                      {i === 0 && <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">Primary</span>}
                      <button onClick={() => handleRemoveCard(i)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition">
                        <MoreVertical size={14} />
                      </button>
                    </div>
                  )) : (
                    <p className="text-xs text-slate-500 italic text-center py-6">No payment methods saved yet.</p>
                  )}

                  {/* Add Card Button */}
                  <button onClick={() => setShowAddCard(!showAddCard)}
                    className="w-full flex items-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-white/10 text-slate-400 hover:border-aura-400 hover:text-aura-500 transition text-sm font-semibold">
                    <Plus size={16} /> Add New Payment Method
                  </button>
                </div>
              </div>

              {/* Add Card Form */}
              {showAddCard && (
                <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-5 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Add New Card</h3>
                  <form onSubmit={async (e) => { await handleAddCard(e); setShowAddCard(false); }} className="space-y-4">
                    <InputRow label="Cardholder Name" value={newCardForm.cardholderName} onChange={(e) => setNewCardForm({ ...newCardForm, cardholderName: e.target.value })} placeholder="John Doe" required />
                    <InputRow label="Card Number" value={newCardForm.cardNumber} onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '').slice(0, 16);
                      let formatted = val.match(/.{1,4}/g)?.join(' ') || val;
                      setNewCardForm({ ...newCardForm, cardNumber: formatted });
                    }} placeholder="4000 1234 5678 9010" required />
                    <div className="grid grid-cols-2 gap-4">
                      <InputRow label="Expiry Date" value={newCardForm.expiryDate} onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        if (val.length >= 2) val = val.slice(0, 2) + '/' + val.slice(2);
                        setNewCardForm({ ...newCardForm, expiryDate: val });
                      }} placeholder="MM/YY" required />
                      <InputRow label="CVV" type="password" value={newCardForm.CVV} onChange={(e) => setNewCardForm({ ...newCardForm, CVV: e.target.value.replace(/\D/g, '').slice(0, 3) })} placeholder="123" required />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button type="button" onClick={() => setShowAddCard(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition">Cancel</button>
                      <button type="submit" disabled={savingBilling} className="flex-1 py-2.5 rounded-xl bg-slate-900 dark:bg-aura-500 text-white text-sm font-semibold hover:bg-slate-800 dark:hover:bg-aura-600 transition disabled:opacity-50">
                        {savingBilling ? 'Adding...' : 'Add Card'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="flex flex-col gap-4">
          {/* Payment Due Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Payment Due</h3>
              {unpaidInvoices.length > 0 && (
                <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                  Due on {new Date(unpaidInvoices[0]?.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900 dark:text-white">₹{patientPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {unpaidInvoices.length} unpaid bill{unpaidInvoices.length !== 1 ? 's' : ''}
                {hasInsurance && totalCovered > 0 && ` (₹${totalCovered.toLocaleString('en-IN')} covered by insurance)`}
              </p>
            </div>
            {unpaidInvoices.length > 0 ? (
              <Link
                to={`/billing/all/checkout`}
                className="w-full text-center py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-sm font-bold transition shadow-md block"
              >
                Make a Payment
              </Link>
            ) : (
              <button
                disabled
                className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 text-sm font-bold cursor-not-allowed"
              >
                Make a Payment
              </button>
            )}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount Breakup</p>
              {[
                { label: 'Total Unpaid Dues', value: `₹${totalUnpaid.toLocaleString('en-IN')}` },
                ...(hasInsurance && totalCovered > 0 ? [
                  { label: `Insurance Coverage (${actualReductionPercent}%)`, value: `-₹${totalCovered.toLocaleString('en-IN')}`, colorClass: 'text-emerald-500 font-medium' }
                ] : []),
                { label: 'Patient Payable', value: `₹${patientPayable.toLocaleString('en-IN')}`, bold: true },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between text-xs">
                  <span className={item.bold ? 'font-bold text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}>{item.label}</span>
                  <span className={item.bold ? 'font-bold text-slate-900 dark:text-white' : item.colorClass ? item.colorClass : 'text-slate-700 dark:text-slate-300'}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Methods Mini */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Payment Methods</h3>
              <button onClick={() => setBillingSubTab('payment')} className="text-[11px] text-aura-500 hover:text-aura-600 font-semibold">Manage</button>
            </div>
            {paymentMethods.length > 0 ? paymentMethods.slice(0, 2).map((pm, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-navy-900/50">
                <div className="w-10 h-7 rounded-md bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center shrink-0">
                  <span className="text-[8px] font-black text-white tracking-wider">VISA</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">•••• {pm.cardNumber?.slice(-4) || '----'}</p>
                  <p className="text-[10px] text-slate-400">Expires {pm.expiryDate}</p>
                </div>
                {i === 0 && <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">Primary</span>}
                <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <MoreVertical size={13} />
                </button>
              </div>
            )) : null}
            <button onClick={() => { setBillingSubTab('payment'); setShowAddCard(true); }}
              className="w-full flex items-center gap-2 p-2.5 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-slate-400 hover:border-aura-400 hover:text-aura-500 transition text-xs font-semibold">
              <Plus size={13} /> Add New Payment Method
            </button>
          </div>

          {/* Help & Support */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-aura-500/10 flex items-center justify-center shrink-0">
                <Headphones size={16} className="text-aura-500" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Need Help?</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">If you have any questions regarding insurance coverage or billing.</p>
              </div>
            </div>
            <button className="w-full py-2.5 rounded-xl border border-aura-500/30 text-aura-600 dark:text-aura-400 text-xs font-bold hover:bg-aura-500/10 transition flex items-center justify-center gap-2">
              <Phone size={13} /> Contact Billing Support
            </button>
          </div>

          {/* Security Notice */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 px-1">
            <Lock size={11} className="shrink-0" />
            <span>Your payment and insurance information is secure and encrypted.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
