import { useEffect, useState } from 'react';
import { 
  LayoutGrid, Calendar, Users, Heart, ClipboardList, 
  FileText, CreditCard, BarChart2, ShoppingBag, Settings, 
  Check, Shield, Sparkles, Activity
} from 'lucide-react';
import { useLoading } from '../../context/LoadingContext';

const PAGE_META = {
  dashboard: {
    icon: LayoutGrid,
    title: 'Dashboard',
    messages: ["Loading today's clinic overview...", "Refreshing dashboard metrics...", "Syncing real-time updates..."]
  },
  appointments: {
    icon: Calendar,
    title: 'Appointments',
    messages: ["Fetching today's appointments...", "Updating doctor timetables...", "Preparing calendar views..."]
  },
  patients: {
    icon: Users,
    title: 'Patients',
    messages: ["Loading patient records...", "Synchronizing patient histories...", "Preparing EMR charts..."]
  },
  doctors: {
    icon: Heart,
    title: 'Doctors',
    messages: ["Preparing doctor schedules...", "Loading provider details...", "Updating availability logs..."]
  },
  staff: {
    icon: Users,
    title: 'Staff',
    messages: ["Loading staff information...", "Resolving credentials...", "Updating permissions..."]
  },
  departments: {
    icon: ClipboardList,
    title: 'Departments',
    messages: ["Fetching departments...", "Loading specialty configurations..."]
  },
  'healthcare-providers': {
    icon: Shield,
    title: 'Providers',
    messages: ["Loading healthcare providers...", "Checking system integrations..."]
  },
  procedures: {
    icon: ClipboardList,
    title: 'Procedures',
    messages: ["Preparing medical procedures...", "Loading catalog fees..."]
  },
  billing: {
    icon: FileText,
    title: 'Billing',
    messages: ["Loading invoices...", "Resolving outstanding dues...", "Preparing statements..."]
  },
  payments: {
    icon: CreditCard,
    title: 'Payments',
    messages: ["Verifying payment records...", "Validating receipts...", "Syncing accounting journals..."]
  },
  reports: {
    icon: BarChart2,
    title: 'Reports',
    messages: ["Generating analytics...", "Compiling clinic trends...", "Preparing insights charts..."]
  },
  inventory: {
    icon: ShoppingBag,
    title: 'Inventory',
    messages: ["Loading inventory status...", "Checking stock ledger...", "Updating supplier links..."]
  },
  settings: {
    icon: Settings,
    title: 'Settings',
    messages: ["Loading clinic configuration...", "Fetching account preferences...", "Saving variables..."]
  }
};

const GlobalLoader = () => {
  const { isLoading, pageKey, stages } = useLoading();
  const [msgIndex, setMsgIndex] = useState(0);

  const meta = PAGE_META[pageKey] || PAGE_META.dashboard;
  const PageIcon = meta.icon;

  useEffect(() => {
    if (!isLoading) return;
    setMsgIndex(0);
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % meta.messages.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [isLoading, pageKey, meta.messages.length]);

  if (!isLoading) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md animate-fade-in p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Loading content"
    >
      <div className="bg-white/95 border border-slate-200/80 shadow-2xl rounded-3xl p-8 max-w-sm w-full flex flex-col items-center text-center space-y-6 animate-scale-up relative overflow-hidden">
        
        {/* Decorative Top Shimmer Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 animate-shimmer" />

        {/* Branding (PEHAL Healthcare) */}
        <div className="flex flex-col items-center gap-1.5 mt-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-black shadow-sm">P</span>
            <span className="text-sm font-black text-slate-800 tracking-tight">PEHAL</span>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI-CMS Enterprise</p>
        </div>

        {/* Animated Page Icon Ring */}
        <div className="relative w-20 h-20 flex items-center justify-center bg-emerald-50/50 rounded-full border border-emerald-100/50 shadow-inner">
          <div className="absolute inset-0 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <PageIcon className="text-emerald-600 animate-pulse float-slow" size={28} />
        </div>

        {/* Page Context Details */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">{meta.title}</h4>
          <p className="text-xs font-extrabold text-slate-700 min-h-[16px] leading-relaxed transition-all duration-300" aria-live="polite">
            {meta.messages[msgIndex]}
          </p>
        </div>

        {/* Real Backend Status Updates */}
        <div className="w-full text-left bg-slate-50 border border-slate-100 rounded-2xl p-4.5 space-y-2.5 max-h-[120px] overflow-y-auto">
          {stages.map((stage, idx) => (
            <div key={idx} className="flex items-center gap-2 text-[10px] font-bold text-slate-605 animate-fade-in">
              <Check className="text-emerald-500 stroke-[3]" size={12} />
              <span>{stage}</span>
            </div>
          ))}
        </div>

        {/* AI Pulse Progress Bar */}
        <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-blue-500 h-full rounded-full animate-shimmer" style={{ width: '80%' }} />
        </div>

      </div>
    </div>
  );
};

export default GlobalLoader;
