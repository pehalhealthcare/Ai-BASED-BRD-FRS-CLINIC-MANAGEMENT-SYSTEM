import { Calendar, ChevronRight, ClipboardList, Clock, FileText, Pill } from 'lucide-react';
import { Link } from 'react-router-dom';
import Badge from '../../../components/ui/Badge';

export default function Records({ appointments, prescriptions, invoices }) {
  return (
    <div className="grid md:grid-cols-2 gap-5">
      {/* Appointments */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 shadow-card dark:shadow-card-dark overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.06] flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-aura-50 dark:bg-aura-500/10 flex items-center justify-center">
            <Calendar size={16} className="text-aura-600 dark:text-aura-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Appointments</h3>
          <Badge color="success" size="sm" className="ml-auto">{appointments.length}</Badge>
        </div>
        <div className="divide-y divide-slate-50 dark:divide-white/[0.04]">
          {appointments.length > 0 ? appointments.map((apt) => (
            <Link key={apt._id} to={`/appointments/${apt._id}`} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition group">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/8 flex items-center justify-center shrink-0 mt-0.5">
                <Clock size={14} className="text-slate-400 dark:text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{apt.doctorId?.fullName || 'Unknown Doctor'}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {apt.appointmentDate ? new Date(apt.appointmentDate).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : 'Date TBD'}
                  {apt.startTime && ` • ${apt.startTime}`}
                </p>
              </div>
              <Badge color={apt.status === 'completed' ? 'success' : apt.status === 'cancelled' ? 'danger' : 'info'} size="sm">
                {apt.status || 'scheduled'}
              </Badge>
            </Link>
          )) : (
            <div className="px-5 py-8 text-center">
              <Calendar size={24} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No appointments yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Prescriptions */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 shadow-card dark:shadow-card-dark overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.06] flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
            <Pill size={16} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Prescriptions</h3>
          <Badge color="accent" size="sm" className="ml-auto">{prescriptions.length}</Badge>
        </div>
        <div className="divide-y divide-slate-50 dark:divide-white/[0.04]">
          {prescriptions.length > 0 ? prescriptions.map((rx) => (
            <Link key={rx._id} to={`/prescriptions/${rx._id}`} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <ClipboardList size={14} className="text-indigo-500 dark:text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                  {rx.medications?.map((m) => m.name).join(', ') || 'Prescription'}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {rx.createdAt ? new Date(rx.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : 'Date TBD'}
                </p>
              </div>
              <ChevronRight size={14} className="text-slate-400 mt-1 shrink-0" />
            </Link>
          )) : (
            <div className="px-5 py-8 text-center">
              <Pill size={24} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No prescriptions yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Invoices */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 shadow-card dark:shadow-card-dark overflow-hidden md:col-span-2">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.06] flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
            <FileText size={16} className="text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Billing & Invoices</h3>
          <Badge color="warning" size="sm" className="ml-auto">{invoices.length}</Badge>
        </div>
        <div className="divide-y divide-slate-50 dark:divide-white/[0.04]">
          {invoices.length > 0 ? invoices.map((inv) => (
            <Link key={inv._id} to={`/billing/${inv._id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Invoice #{inv.invoiceNumber || inv._id?.slice(-6)}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : ''}
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-sm font-bold text-slate-900 dark:text-white">₹{inv.totalAmount || 0}</p>
                <Badge color={inv.paymentStatus === 'paid' ? 'success' : 'warning'} size="sm">{inv.paymentStatus || 'pending'}</Badge>
              </div>
            </Link>
          )) : (
            <div className="px-5 py-8 text-center">
              <FileText size={24} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No invoices yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
