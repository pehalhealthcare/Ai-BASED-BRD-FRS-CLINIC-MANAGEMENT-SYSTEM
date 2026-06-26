import { useState, useEffect } from 'react';
import { settlementsApi, doctorApi } from '../../lib/api';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import { 
  Download, Stethoscope, Settings, Calendar, DollarSign, Wallet, 
  ArrowUpRight, Activity, TrendingUp
} from 'lucide-react';

export default function DoctorEarningsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [data, setData] = useState(null);
  const [dateRange] = useState('01 Jun 2026 - 30 Jun 2026');
  const [isDownloading, setIsDownloading] = useState(false);

  const fetchEarningsData = async () => {
    setLoading(true);
    setError('');
    try {
      const profileRes = await doctorApi.getMyProfile();
      const doc = profileRes.data?.doctor || profileRes.doctor;
      setDoctorProfile(doc);

      if (doc?._id) {
        const earningsRes = await settlementsApi.getDoctorEarnings(doc._id);
        setData(earningsRes.data || earningsRes);
      } else {
        throw new Error('Doctor profile not found.');
      }
    } catch (err) {
      console.error('Failed to load earnings data:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load earnings dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarningsData();
  }, []);

  const handleDownloadReport = () => {
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);
      alert('Earnings Report (PDF) downloaded successfully!');
    }, 1500);
  };

  const handleRequestPayout = () => {
    alert('Your payout request for ₹' + (data?.summary?.pendingPayout || 0).toLocaleString('en-IN') + ' has been submitted to the Clinic Administrator.');
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchEarningsData} />;

  const summary = data?.summary || {};
  const trend = data?.trend || [];
  const breakdown = data?.breakdown || [];
  const transactions = data?.recentTransactions || [];

  return (
    <div className="space-y-6 pb-10 animate-fade-in text-slate-800 dark:text-slate-100">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Doctor Earnings</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Dashboard &gt; Earnings</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Mock Date Filter */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-white/[0.08] shadow-sm text-xs font-semibold text-slate-600 dark:text-slate-300">
            <Calendar size={14} className="text-slate-400" />
            <span>{dateRange}</span>
          </div>
          <button 
            onClick={handleDownloadReport}
            disabled={isDownloading}
            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-white/[0.08] shadow-sm hover:bg-slate-50 dark:hover:bg-white/[0.04] transition cursor-pointer text-slate-700 dark:text-slate-200"
          >
            <Download size={14} />
            {isDownloading ? 'Downloading...' : 'Download Report'}
          </button>
        </div>
      </div>

      {/* Top 4 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Earnings */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-5 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Earnings</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 font-mono">
                ₹{(summary.totalEarnings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-2 flex items-center gap-1">
                <ArrowUpRight size={12} /> {summary.totalEarningsChange}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0 group-hover:scale-105 transition animate-pulse">
              <Wallet size={20} />
            </div>
          </div>
        </div>

        {/* Card 2: Consultation Earnings */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-5 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Consultation Earnings</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 font-mono">
                ₹{(summary.consultationEarnings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-medium">
                {((summary.consultationEarnings / summary.totalEarnings) * 100).toFixed(1)}% of total earnings
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0 group-hover:scale-105 transition">
              <Stethoscope size={20} />
            </div>
          </div>
        </div>

        {/* Card 3: Procedure Earnings */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-5 shadow-sm relative overflow-hidden group font-sans">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Procedure Earnings</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 font-mono">
                ₹{(summary.procedureEarnings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-medium">
                {((summary.procedureEarnings / summary.totalEarnings) * 100).toFixed(1)}% of total earnings
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0 group-hover:scale-105 transition">
              <Activity size={20} />
            </div>
          </div>
        </div>

        {/* Card 4: Other Earnings */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-5 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Other Earnings</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 font-mono">
                ₹{(summary.otherEarnings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-medium">
                {((summary.otherEarnings / summary.totalEarnings) * 100).toFixed(1)}% of total earnings
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0 group-hover:scale-105 transition">
              <Settings size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Graph and Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT: Trend Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-955 dark:text-white">Earnings Trend</h3>
            <select className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-navy-900 text-slate-600 dark:text-slate-300">
              <option>Monthly</option>
              <option>Weekly</option>
            </select>
          </div>

          {/* SVG Custom Area Chart */}
          <div className="relative h-64 w-full">
            <svg viewBox="0 0 600 240" className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="gradient-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="40" x2="600" y2="40" stroke="rgba(128,128,128,0.08)" strokeDasharray="3 3" />
              <line x1="0" y1="90" x2="600" y2="90" stroke="rgba(128,128,128,0.08)" strokeDasharray="3 3" />
              <line x1="0" y1="140" x2="600" y2="140" stroke="rgba(128,128,128,0.08)" strokeDasharray="3 3" />
              <line x1="0" y1="190" x2="600" y2="190" stroke="rgba(128,128,128,0.08)" strokeDasharray="3 3" />

              {/* Y Axis Labels */}
              <text x="5" y="45" fill="rgba(128,128,128,0.6)" fontSize="9" fontWeight="bold">₹100K</text>
              <text x="5" y="95" fill="rgba(128,128,128,0.6)" fontSize="9" fontWeight="bold">₹80K</text>
              <text x="5" y="145" fill="rgba(128,128,128,0.6)" fontSize="9" fontWeight="bold">₹50K</text>
              <text x="5" y="195" fill="rgba(128,128,128,0.6)" fontSize="9" fontWeight="bold">₹20K</text>

              {/* Chart Line Path */}
              <path
                d="M 50 156 Q 140 138 230 128 T 410 122 T 550 75"
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Gradient Area Fill */}
              <path
                d="M 50 156 Q 140 138 230 128 T 410 122 T 550 75 L 550 210 L 50 210 Z"
                fill="url(#gradient-area)"
              />

              {/* Points */}
              <circle cx="50" cy="156" r="4" fill="#ffffff" stroke="#10b981" strokeWidth="2.5" />
              <circle cx="150" cy="138" r="4" fill="#ffffff" stroke="#10b981" strokeWidth="2.5" />
              <circle cx="250" cy="128" r="4" fill="#ffffff" stroke="#10b981" strokeWidth="2.5" />
              <circle cx="350" cy="140" r="4" fill="#ffffff" stroke="#10b981" strokeWidth="2.5" />
              <circle cx="450" cy="122" r="4" fill="#ffffff" stroke="#10b981" strokeWidth="2.5" />
              <circle cx="550" cy="75" r="5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
            </svg>

            {/* Custom Tooltip */}
            <div className="absolute top-12 right-20 bg-slate-950 text-white rounded-xl py-1.5 px-3 border border-white/10 text-[10px] font-bold shadow-lg">
              <p className="text-slate-400">Jun 2026</p>
              <p className="text-sm font-black text-emerald-400 mt-0.5 font-mono">₹{(summary.totalEarnings || 0).toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* X Axis Labels */}
          <div className="flex justify-between px-10 text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-4">
            <span>Jan 2026</span>
            <span>Feb 2026</span>
            <span>Mar 2026</span>
            <span>Apr 2026</span>
            <span>May 2026</span>
            <span>Jun 2026</span>
          </div>
        </div>

        {/* RIGHT: Earnings Summary */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-5 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-slate-950 dark:text-white mb-5">Earnings Summary</h3>
          
          <div className="space-y-4 flex-1">
            {[
              { label: 'Total Appointments', value: summary.totalAppointments, iconColor: 'text-indigo-500', bg: 'bg-indigo-500/10' },
              { label: 'Paid Appointments', value: summary.paidAppointments, iconColor: 'text-emerald-500', bg: 'bg-emerald-500/10' },
              { label: 'Average Earning / Appointment', value: `₹${(summary.averageEarningPerAppointment || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, iconColor: 'text-blue-500', bg: 'bg-blue-500/10' },
              { label: 'Pending Payout', value: `₹${(summary.pendingPayout || 0).toLocaleString('en-IN')}`, iconColor: 'text-amber-500', bg: 'bg-amber-500/10', highlight: 'text-amber-600 dark:text-amber-400 font-bold' },
              { label: 'Next Payout Date', value: summary.nextPayoutDate, iconColor: 'text-purple-500', bg: 'bg-purple-500/10', highlight: 'text-emerald-500 dark:text-emerald-400 font-bold' }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/[0.04]">
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                    <Calendar size={14} className={item.iconColor} />
                  </div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{item.label}</span>
                </div>
                <span className={`text-xs font-bold font-mono ${item.highlight || 'text-slate-800 dark:text-slate-200'}`}>{item.value}</span>
              </div>
            ))}
          </div>

          <button 
            onClick={handleRequestPayout}
            className="w-full mt-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <DollarSign size={14} />
            Request Payout
          </button>
        </div>
      </div>

      {/* Grid: Breakdown and Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT: Breakdown */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-5 shadow-sm flex flex-col justify-between">
          <h3 className="text-sm font-bold text-slate-955 dark:text-white mb-5">Earnings Breakdown</h3>

          {/* Donut Chart */}
          <div className="flex justify-center items-center py-4 relative">
            <svg width="150" height="150" viewBox="0 0 42 42" className="transform -rotate-90">
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="rgba(128,128,128,0.08)" strokeWidth="4.2" />
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#10b981" strokeWidth="4.2" strokeDasharray="70.6 29.4" strokeDashoffset="0" />
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#8b5cf6" strokeWidth="4.2" strokeDasharray="22.7 77.3" strokeDashoffset="-70.6" />
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f59e0b" strokeWidth="4.2" strokeDasharray="4.6 95.4" strokeDashoffset="-93.3" />
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#3b82f6" strokeWidth="4.2" strokeDasharray="2.1 97.9" strokeDashoffset="-97.9" />
            </svg>
            <div className="absolute inset-0 flex flex-col justify-center items-center">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Total</p>
              <p className="text-sm font-black text-slate-905 dark:text-white font-mono">₹{(summary.totalEarnings || 0).toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div className="space-y-3 mt-4">
            {breakdown.map((item, idx) => {
              const colors = [
                { dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
                { dot: 'bg-purple-500', bar: 'bg-purple-500' },
                { dot: 'bg-amber-500', bar: 'bg-amber-500' },
                { dot: 'bg-blue-500', bar: 'bg-blue-500' }
              ];
              const curColor = colors[idx] || colors[0];
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${curColor.dot}`} />
                      <span className="text-slate-600 dark:text-slate-400">{item.name}</span>
                    </div>
                    <div className="space-x-3 font-mono">
                      <span className="text-slate-800 dark:text-slate-200">₹{(item.amount || 0).toLocaleString('en-IN')}</span>
                      <span className="text-slate-400">{(item.percentage || 0).toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="h-1 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                    <div className={`h-full rounded-full ${curColor.bar}`} style={{ width: `${item.percentage || 0}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Recent Transactions */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-950 dark:text-white">Recent Transactions</h3>
            <button onClick={() => alert('Transactions view expanded')} className="text-xs font-semibold text-emerald-500 hover:underline">View All</button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5 text-slate-400 bg-slate-50 dark:bg-navy-900/40">
                  <th className="px-3 py-2.5 font-bold">Date</th>
                  <th className="px-3 py-2.5 font-bold">Description</th>
                  <th className="px-3 py-2.5 font-bold">Type</th>
                  <th className="px-3 py-2.5 font-bold text-right">Amount</th>
                  <th className="px-3 py-2.5 font-bold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {transactions.map((tx, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-navy-900/20 transition">
                    <td className="px-3 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{tx.date}</td>
                    <td className="px-3 py-3 font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[150px]">{tx.description}</td>
                    <td className="px-3 py-3 text-slate-500 dark:text-slate-400">{tx.type}</td>
                    <td className="px-3 py-3 text-right font-bold text-slate-950 dark:text-white font-mono">₹{(tx.amount || 0).toLocaleString('en-IN')}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Growth Card Banner */}
      <div className="rounded-2xl p-5 border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 flex flex-col sm:flex-row items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
          <TrendingUp size={20} />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white font-sans">Keep growing your practice!</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{summary.growthMessage}</p>
        </div>
        <button 
          onClick={() => alert('Insights details coming soon!')}
          className="px-4 py-2 rounded-xl border border-amber-500/30 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold transition shrink-0 cursor-pointer"
        >
          View Insights
        </button>
      </div>
    </div>
  );
}
