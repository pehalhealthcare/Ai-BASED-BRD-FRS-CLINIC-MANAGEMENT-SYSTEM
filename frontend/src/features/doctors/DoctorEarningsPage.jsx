import { useState, useEffect, useMemo } from 'react';
import { settlementsApi, doctorApi } from '../../lib/api';
import useAuth from '../../hooks/useAuth';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import { 
  Download, Stethoscope, Settings, Calendar, DollarSign, Wallet, 
  ArrowUpRight, Activity, TrendingUp, RefreshCw, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DoctorEarningsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [data, setData] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);

  // Date filter options
  const [dateOption, setDateOption] = useState('This Month');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customRange, setCustomRange] = useState({
    from: '',
    to: ''
  });

  // Calculate dates based on option
  const dateParams = useMemo(() => {
    const now = new Date();
    let fromDate = new Date();
    let toDate = new Date();

    switch (dateOption) {
      case 'Today':
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);
        break;
      case 'This Week':
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        fromDate = new Date(now.setDate(diff));
        fromDate.setHours(0, 0, 0, 0);
        toDate = new Date(fromDate);
        toDate.setDate(toDate.getDate() + 6);
        toDate.setHours(23, 59, 59, 999);
        break;
      case 'This Month':
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'Last Month':
        fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        toDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case 'Last 3 Months':
        fromDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        toDate = new Date();
        break;
      case 'Last 6 Months':
        fromDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        toDate = new Date();
        break;
      case 'Custom':
        if (customRange.from && customRange.to) {
          fromDate = new Date(customRange.from);
          toDate = new Date(customRange.to);
          toDate.setHours(23, 59, 59, 999);
        } else {
          // Fallback to month
          fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
          toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        }
        break;
      default:
        break;
    }

    return {
      from: fromDate.toISOString().split('T')[0],
      to: toDate.toISOString().split('T')[0]
    };
  }, [dateOption, customRange]);

  const fetchEarningsData = async () => {
    setLoading(true);
    setError('');
    try {
      const profileRes = await doctorApi.getMyProfile();
      const doc = profileRes.data?.doctor || profileRes.doctor;
      setDoctorProfile(doc);

      if (doc?._id) {
        // Pass real selected dates and branch parameters
        const queryParams = {
          from: dateParams.from,
          to: dateParams.to,
          clinicId: doc.clinicId
        };
        const earningsRes = await settlementsApi.getDoctorEarnings(doc._id, queryParams);
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
  }, [dateParams]);

  const handleDownloadReport = () => {
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);
      // Generate actual download of the page context earnings details
      const reportHeaders = ['Date', 'Description', 'Type', 'Amount', 'Status'];
      const reportRows = (data?.recentTransactions || []).map(t => [
        t.date,
        t.description,
        t.type,
        `INR ${t.amount}`,
        t.status
      ]);
      const csvContent = "data:text/csv;charset=utf-8," 
        + [reportHeaders.join(','), ...reportRows.map(e => e.join(','))].join('\n');
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Doctor_Earnings_Report_${dateParams.from}_to_${dateParams.to}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Earnings CSV report downloaded successfully!');
    }, 1200);
  };

  const handleRequestPayout = async () => {
    if (!data?.summary?.pendingPayout || data.summary.pendingPayout <= 0) {
      toast.error('Insufficient eligible payout balance.');
      return;
    }

    setIsRequestingPayout(true);
    try {
      await settlementsApi.requestPayout(doctorProfile._id);
      toast.success('Your payout request has been submitted successfully to the Clinic Administrator.');
      fetchEarningsData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit payout request.');
    } finally {
      setIsRequestingPayout(false);
    }
  };

  if (loading && !data) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchEarningsData} />;

  const summary = data?.summary || {};
  const trend = data?.trend || [];
  const breakdown = data?.breakdown || [];
  const transactions = data?.recentTransactions || [];

  // Donut SVG parameters
  const total = summary.totalEarnings || 0;

  // Chart plotting helper coordinates
  const maxChartValue = Math.max(...trend.map(t => t.value), 1000);
  const chartCoordinates = trend.map((t, idx) => {
    const x = 50 + (idx / Math.max(1, trend.length - 1)) * 500;
    const y = 200 - (t.value / maxChartValue) * 150;
    return { x, y };
  });

  const linePathD = chartCoordinates.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const areaPathD = chartCoordinates.length > 0 
    ? `${linePathD} L ${chartCoordinates[chartCoordinates.length - 1].x} 200 L ${chartCoordinates[0].x} 200 Z`
    : '';

  return (
    <div className="space-y-6 pb-10 animate-fade-in text-slate-800 dark:text-slate-100">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-150 rounded-3xl p-6 shadow-sm relative overflow-hidden">
        <div>
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">DOCTOR PORTAL</span>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 mt-1">Doctor Earnings</h1>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Track your earnings, payouts, and financial performance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Dynamic Date Filter Dropdown */}
          <div className="relative">
            <select
              value={dateOption}
              onChange={(e) => {
                setDateOption(e.target.value);
                if (e.target.value !== 'Custom') {
                  setShowDatePicker(false);
                } else {
                  setShowDatePicker(true);
                }
              }}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-slate-200 shadow-sm text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              {['Today', 'This Week', 'This Month', 'Last Month', 'Last 3 Months', 'Last 6 Months', 'Custom'].map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {showDatePicker && (
            <div className="flex items-center gap-2 text-xs font-bold">
              <input
                type="date"
                value={customRange.from}
                onChange={(e) => setCustomRange(p => ({ ...p, from: e.target.value }))}
                className="px-2.5 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 outline-none"
              />
              <span>to</span>
              <input
                type="date"
                value={customRange.to}
                onChange={(e) => setCustomRange(p => ({ ...p, to: e.target.value }))}
                className="px-2.5 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 outline-none"
              />
            </div>
          )}

          <button 
            onClick={handleDownloadReport}
            disabled={isDownloading || transactions.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-extrabold rounded-xl bg-slate-900 text-white shadow-md hover:bg-slate-800 transition cursor-pointer"
          >
            <Download size={14} />
            {isDownloading ? 'Generating...' : 'Download Report'}
          </button>
        </div>
      </div>

      {/* Top 4 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Earnings */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Earnings</p>
              <h3 className="text-2xl font-black text-slate-900 mt-2 font-mono">
                ₹{(summary.totalEarnings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-emerald-600 font-bold mt-2.5 flex items-center gap-1">
                <ArrowUpRight size={12} /> {summary.totalEarningsChange}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
              <Wallet size={18} />
            </div>
          </div>
        </div>

        {/* Card 2: Consultation Earnings */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Consultation Earnings</p>
              <h3 className="text-2xl font-black text-slate-900 mt-2 font-mono">
                ₹{(summary.consultationEarnings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-slate-400 mt-2.5 font-bold">
                {total > 0 ? ((summary.consultationEarnings / total) * 100).toFixed(1) : 0}% of total earnings
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
              <Stethoscope size={18} />
            </div>
          </div>
        </div>

        {/* Card 3: Procedure Earnings */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Procedure Earnings</p>
              <h3 className="text-2xl font-black text-slate-900 mt-2 font-mono">
                ₹{(summary.procedureEarnings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-slate-400 mt-2.5 font-bold">
                {total > 0 ? ((summary.procedureEarnings / total) * 100).toFixed(1) : 0}% of total earnings
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
              <Activity size={18} />
            </div>
          </div>
        </div>

        {/* Card 4: Other Earnings */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Other Earnings</p>
              <h3 className="text-2xl font-black text-slate-900 mt-2 font-mono">
                ₹{(summary.otherEarnings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-slate-400 mt-2.5 font-bold">
                {total > 0 ? ((summary.otherEarnings / total) * 100).toFixed(1) : 0}% of total earnings
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
              <Settings size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Graph and Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* LEFT: Trend Chart */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-black text-slate-800">Earnings Trend</h3>
            <span className="text-[10px] text-slate-400 font-bold">Daily / Monthly Aggregate</span>
          </div>

          {/* SVG Custom Area Chart */}
          <div className="relative h-64 w-full">
            {trend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                No earnings data available for the selected period.
              </div>
            ) : (
              <>
                <svg viewBox="0 0 600 240" className="w-full h-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="gradient-area" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Grid Lines */}
                  {[40, 90, 140, 190].map(yVal => (
                    <line key={yVal} x1="50" y1={yVal} x2="550" y2={yVal} stroke="rgba(148,163,184,0.12)" strokeDasharray="3 3" />
                  ))}

                  {/* Chart Line Path */}
                  {linePathD && (
                    <path
                      d={linePathD}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  )}

                  {/* Gradient Area Fill */}
                  {areaPathD && (
                    <path
                      d={areaPathD}
                      fill="url(#gradient-area)"
                    />
                  )}

                  {/* Points */}
                  {chartCoordinates.map((c, i) => (
                    <circle key={i} cx={c.x} cy={c.y} r="4.5" fill="#ffffff" stroke="#10b981" strokeWidth="2.5" />
                  ))}
                </svg>

                {/* X Axis Labels */}
                <div className="flex justify-between px-12 text-[9px] text-slate-400 font-black uppercase mt-2">
                  {trend.map((t, idx) => (
                    <span key={idx}>{t.label}</span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT: Earnings Summary */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-800 mb-5">Earnings Summary</h3>
            
            <div className="space-y-4">
              {[
                { label: 'Total Appointments', value: summary.totalAppointments },
                { label: 'Paid Appointments', value: summary.paidAppointments },
                { label: 'Average Earning / Appointment', value: `₹${(summary.averageEarningPerAppointment || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` },
                { label: 'Pending Payout', value: `₹${(summary.pendingPayout || 0).toLocaleString('en-IN')}`, highlight: 'text-amber-600 font-black' },
                { label: 'Next Payout Date', value: summary.nextPayoutDate, highlight: 'text-blue-600 font-bold' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-500">{item.label}</span>
                  <span className={`text-xs font-bold font-mono ${item.highlight || 'text-slate-800'}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={handleRequestPayout}
            disabled={isRequestingPayout || !summary.pendingPayout || summary.pendingPayout <= 0}
            className="w-full mt-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-extrabold transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/10"
          >
            <DollarSign size={14} />
            {isRequestingPayout ? 'Submitting Request...' : 'Request Payout'}
          </button>
        </div>
      </div>

      {/* Grid: Breakdown and Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT: Breakdown */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <h3 className="text-sm font-black text-slate-805 mb-5">Earnings Breakdown</h3>

          {total === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 italic">No breakdown available.</div>
          ) : (
            <>
              {/* Donut Chart */}
              <div className="flex justify-center items-center py-4 relative">
                <svg width="130" height="130" viewBox="0 0 42 42" className="transform -rotate-90">
                  <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="rgba(148,163,184,0.08)" strokeWidth="4.2" />
                  {/* Render segments representing percentages of total */}
                  {breakdown.map((item, idx) => {
                    const strokeColors = ['#10b981', '#8b5cf6', '#f59e0b', '#3b82f6'];
                    const color = strokeColors[idx] || '#cbd5e1';
                    
                    // Cumulative dash offset calculation
                    let cumulativePercentage = 0;
                    for (let i = 0; i < idx; i++) {
                      cumulativePercentage += breakdown[i].percentage || 0;
                    }
                    const dashoffset = 100 - cumulativePercentage;
                    
                    return (
                      <circle
                        key={idx}
                        cx="21"
                        cy="21"
                        r="15.915"
                        fill="transparent"
                        stroke={color}
                        strokeWidth="4.2"
                        strokeDasharray={`${item.percentage || 0} ${100 - (item.percentage || 0)}`}
                        strokeDashoffset={dashoffset}
                      />
                    );
                  })}
                </svg>
                <div className="absolute inset-0 flex flex-col justify-center items-center">
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total</p>
                  <p className="text-xs font-black text-slate-800 font-mono">₹{total.toLocaleString('en-IN')}</p>
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
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${curColor.dot}`} />
                          <span className="text-slate-655">{item.name}</span>
                        </div>
                        <div className="space-x-3 font-mono">
                          <span className="text-slate-800">₹{(item.amount || 0).toLocaleString('en-IN')}</span>
                          <span className="text-slate-400">{(item.percentage || 0).toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full ${curColor.bar}`} style={{ width: `${item.percentage || 0}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* RIGHT: Recent Transactions */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-slate-800">Recent Transactions</h3>
          </div>

          <div className="overflow-x-auto flex-1">
            {transactions.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-450 italic">
                No transactions recorded yet.
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 bg-slate-50/50">
                    <th className="px-3 py-2.5 font-black uppercase tracking-wider">Date</th>
                    <th className="px-3 py-2.5 font-black uppercase tracking-wider">Description</th>
                    <th className="px-3 py-2.5 font-black uppercase tracking-wider">Type</th>
                    <th className="px-3 py-2.5 font-black uppercase tracking-wider text-right">Amount</th>
                    <th className="px-3 py-2.5 font-black uppercase tracking-wider text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((tx, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition">
                      <td className="px-3 py-3 text-slate-500 whitespace-nowrap">{tx.date}</td>
                      <td className="px-3 py-3 font-semibold text-slate-800 truncate max-w-[150px]">{tx.description}</td>
                      <td className="px-3 py-3 text-slate-500 font-bold">{tx.type}</td>
                      <td className="px-3 py-3 text-right font-bold text-slate-900 font-mono">₹{(tx.amount || 0).toLocaleString('en-IN')}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          tx.status === 'Paid'
                            ? 'bg-emerald-50 border-emerald-150 text-emerald-600'
                            : 'bg-amber-50 border-amber-150 text-amber-600'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Growth Card Banner */}
      <div className="rounded-3xl p-5 border border-amber-200 bg-amber-50/50 flex flex-col sm:flex-row items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
          <TrendingUp size={20} />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h4 className="text-sm font-black text-slate-850">Keep growing your practice!</h4>
          <p className="text-xs text-slate-500 mt-1">{summary.growthMessage || "Keep up the excellent work!"}</p>
        </div>
      </div>
    </div>
  );
}
