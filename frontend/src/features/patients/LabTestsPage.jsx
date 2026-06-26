import { useEffect, useState } from 'react';
import {
  FlaskConical, Search, Clock, Droplet, ClipboardList, CheckCircle,
  AlertCircle, Calendar, X, ChevronRight, Activity, Bell, FileText,
  Filter, ArrowRight, ShieldAlert, BadgeInfo
} from 'lucide-react';
import { labApi, patientApi } from '../../lib/api';
import useAuth from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { FullPageSpinner } from '../../components/ui/Spinner';

export default function LabTestsPage() {
  const { user } = useAuth();
  const [labTests, setLabTests] = useState([]);
  const [orders, setOrders] = useState([]);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeSubTab, setActiveSubTab] = useState('available'); // 'available' or 'packages'
  const [sidebarTab, setSidebarTab] = useState('upcoming'); // 'upcoming' or 'completed'

  // Booking modal state
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [bookingDate, setBookingDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [bookingTime, setBookingTime] = useState('09:00');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingStatus, setBookingStatus] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    const fetchLabData = async () => {
      try {
        setLoading(true);
        // 1. Fetch available tests catalog
        const testsRes = await labApi.listTests({ limit: 50, isActive: true });
        setLabTests(testsRes.data?.labTests || testsRes.labTests || []);

        // 2. Fetch patient details & patient booked orders
        const meRes = await patientApi.me().catch(() => null);
        const pt = meRes?.data?.patient || meRes?.patient;
        if (pt) {
          setPatient(pt);
          const ordersRes = await patientApi.labs(pt._id).catch(() => ({ data: { labOrders: [] } }));
          const fetchedOrders = ordersRes.data?.labOrders || ordersRes.labOrders || ordersRes.data?.orders || ordersRes.orders || [];
          setOrders(fetchedOrders);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch lab test catalog.');
      } finally {
        setLoading(false);
      }
    };
    fetchLabData();
  }, []);

  const handleBookTest = async (e) => {
    e.preventDefault();
    if (!selectedTest) return;

    try {
      setBookingStatus('booking');
      
      const payload = {
        patientId: patient?._id,
        tests: [{ labTestId: selectedTest._id }],
        notes: bookingNotes,
        priority: 'routine',
        clinicId: selectedTest.clinicId
      };
      
      await labApi.createOrder(payload);
      
      setBookingStatus('success');
      setBookingSuccess(true);
      
      // Reload orders after successful creation
      if (patient?._id) {
        const ordersRes = await patientApi.labs(patient._id).catch(() => ({ data: { labOrders: [] } }));
        const fetchedOrders = ordersRes.data?.labOrders || ordersRes.labOrders || ordersRes.data?.orders || ordersRes.orders || [];
        setOrders(fetchedOrders);
      }

      setTimeout(() => {
        setBookingSuccess(false);
        setBookingModalOpen(false);
        setSelectedTest(null);
        setBookingNotes('');
        setBookingStatus('');
      }, 2500);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to confirm booking. Please try again.');
      setBookingStatus('');
    }
  };

  const categories = ['All', ...new Set(labTests.map(t => t.category).filter(Boolean))];

  const filteredTests = labTests.filter(test => {
    const matchesSearch = test.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          test.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || test.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Split orders into upcoming vs completed
  const upcomingOrders = orders.filter(o => o.status?.toLowerCase() !== 'completed' && o.status?.toLowerCase() !== 'cancelled');
  const completedOrders = orders.filter(o => o.status?.toLowerCase() === 'completed');

  if (loading) return <FullPageSpinner message="Retrieving the Lab Diagnostics catalog..." />;

  return (
    <div className="w-full space-y-6 p-4 md:p-6 animate-fade-in">
      
      {/* ERROR DISPLAY */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* TWO COLUMN PORTAL LAYOUT */}
      <div className="flex flex-col lg:flex-row gap-6 w-full items-start">
        
        {/* LEFT COLUMN: Main Catalog Search & Book (2/3 width) */}
        <div className="flex-1 min-w-0 space-y-6 w-full lg:w-2/3">
          
          {/* Header Panel */}
          <div className="relative overflow-hidden rounded-2xl p-6 bg-[#060d18] dark:bg-navy-900 border border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Background glow */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-aura-500/10 blur-3xl" />
              <div className="absolute -bottom-16 -left-10 w-64 h-64 rounded-full bg-indigo-600/10 blur-3xl" />
            </div>

            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <FlaskConical size={26} className="text-indigo-400 animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-extrabold text-white">Book a Lab Test</h1>
                <p className="text-xs text-slate-400 mt-1 max-w-md">
                  Choose from a wide range of lab tests and packages. Fast reports, accurate results.
                </p>
              </div>
            </div>
          </div>

          {/* Sub-tab Navigation */}
          <div className="flex border-b border-slate-200 dark:border-white/[0.06] gap-4">
            <button
              onClick={() => setActiveSubTab('available')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all duration-150 ${
                activeSubTab === 'available'
                  ? 'border-aura-500 text-aura-600 dark:text-aura-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              Available Tests
            </button>
            <button
              onClick={() => setActiveSubTab('packages')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all duration-150 ${
                activeSubTab === 'packages'
                  ? 'border-aura-500 text-aura-600 dark:text-aura-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              Health Packages
            </button>
          </div>

          {activeSubTab === 'available' ? (
            <>
              {/* Filters & Control bar */}
              <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-navy-800 p-4 rounded-2xl border border-slate-200 dark:border-white/[0.08]">
                <div className="relative w-full sm:flex-1">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tests by name or keyword..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-aura-500 transition"
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-900 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
                  >
                    <option value="All">All Categories</option>
                    {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-900 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none">
                    <option>Sort By</option>
                    <option>Price: Low to High</option>
                    <option>Price: High to Low</option>
                  </select>
                  <button className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-900 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition">
                    <Filter size={13} />
                    Filters
                  </button>
                </div>
              </div>

              {/* Catalog Table */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-navy-900/20">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">All Available Tests</h3>
                </div>

                <div className="overflow-x-auto">
                  {filteredTests.length > 0 ? (
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-white/[0.06] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <th className="p-4">Test Name</th>
                          <th className="p-4">Category</th>
                          <th className="p-4">Sample Type</th>
                          <th className="p-4">Report Time</th>
                          <th className="p-4">Price</th>
                          <th className="p-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                        {filteredTests.map(test => (
                          <tr key={test._id} className="hover:bg-slate-50/50 dark:hover:bg-navy-900/20 transition-colors">
                            <td className="p-4 max-w-[280px]">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{test.name}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{test.code || 'LAB-TEST'} • Details: standard lab validation</p>
                            </td>
                            <td className="p-4">
                              <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/10">
                                {test.category || 'Diagnostics'}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                                <Droplet size={11} className="text-rose-500" />
                                {test.specimenType || 'Blood'}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                                <Clock size={11} className="text-amber-500" />
                                24 hrs
                              </span>
                            </td>
                            <td className="p-4">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">₹{Number(test.price || 0).toFixed(2)}</p>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => {
                                  setSelectedTest(test);
                                  setBookingModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-aura-600 hover:bg-aura-700 text-white text-xs font-bold transition"
                              >
                                <Calendar size={11} />
                                Book Now
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center py-16">
                      <FlaskConical size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Diagnostic Tests Found</p>
                      <p className="text-xs text-slate-400 mt-1">Try relaxing your search keywords or choosing another category.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-8 text-center">
              <FlaskConical size={40} className="mx-auto text-indigo-500 mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Comprehensive Health Packages</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1.5 leading-relaxed">
                Save up to 40% with bundled diagnostic packages including complete full-body profiles, cardiac validation, and diabetic review checkups.
              </p>
              <button
                onClick={() => setActiveSubTab('available')}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-aura-600 hover:bg-aura-700 text-white text-xs font-bold transition"
              >
                Browse Individual Tests
                <ArrowRight size={13} />
              </button>
            </div>
          )}

          {/* Footer banner */}
          <p className="text-[11px] text-slate-400 dark:text-slate-600 text-center leading-relaxed max-w-md mx-auto pt-3">
            ℹ️ Sample collection and report times may vary based on test type and location. Please follow the instructions provided during booking.
          </p>
        </div>

        {/* RIGHT COLUMN: Sidebar (1/3 width) */}
        <div className="w-full lg:w-1/3 space-y-6">
          
          {/* My Lab Appointments Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-5">
            <div className="flex justify-between items-center pb-3 mb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">My Lab Appointments</h3>
              <button onClick={() => alert('Viewing all booked lab orders')} className="text-xs font-bold text-aura-500 hover:text-aura-600">View All</button>
            </div>

            {/* Sub-tab: Upcoming / Completed */}
            <div className="flex gap-2 p-1 rounded-xl bg-slate-50 dark:bg-navy-900/60 border border-slate-200 dark:border-white/10 mb-4">
              <button
                onClick={() => setSidebarTab('upcoming')}
                className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all ${
                  sidebarTab === 'upcoming'
                    ? 'bg-white dark:bg-navy-700 text-slate-800 dark:text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setSidebarTab('completed')}
                className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all ${
                  sidebarTab === 'completed'
                    ? 'bg-white dark:bg-navy-700 text-slate-800 dark:text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                Completed
              </button>
            </div>

            {/* List of orders */}
            <div className="space-y-3">
              {(sidebarTab === 'upcoming' ? upcomingOrders : completedOrders).length > 0 ? (
                (sidebarTab === 'upcoming' ? upcomingOrders : completedOrders).slice(0, 3).map(ord => {
                  const d = ord.appointmentDate ? new Date(ord.appointmentDate) : new Date();
                  const day = d.toLocaleDateString('en-IN', { day: '2-digit' });
                  const month = d.toLocaleDateString('en-IN', { month: 'short' });
                  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div
                      key={ord._id}
                      className="p-3 rounded-xl border border-slate-100 dark:border-white/[0.04] bg-slate-50/50 dark:bg-navy-900/40 flex items-start gap-3 relative hover:border-aura-400/30 transition-all"
                    >
                      {/* Date Block */}
                      <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-center flex flex-col justify-center shrink-0">
                        <span className="text-sm font-extrabold text-indigo-500 leading-none">{day}</span>
                        <span className="text-[9px] uppercase font-bold text-indigo-400 mt-0.5">{month}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{ord.testId?.name || 'Lab Diagnostic Test'}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{month} {day}, {d.getFullYear()} • {time}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 italic truncate">{ord.notes || 'AI-CMS Diagnostics Lab'}</p>
                        
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${
                            ord.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/10'
                              : ord.status === 'cancelled'
                              ? 'bg-rose-500/10 text-rose-500 border-rose-500/10'
                              : 'bg-sky-500/10 text-sky-500 border-sky-500/10'
                          }`}>
                            {ord.status ? ord.status.charAt(0).toUpperCase() + ord.status.slice(1) : 'Scheduled'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 text-center py-6">No {sidebarTab} lab appointments.</p>
              )}

              <button
                onClick={() => setSelectedCategory('All')}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
              >
                <Calendar size={13} />
                Book New Test
              </button>
            </div>
          </div>

          {/* Health Insights */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Health Insights</h3>
              <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10">New</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-navy-900/50 border border-slate-100 dark:border-white/[0.04] space-y-3">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                Track your health over time. Regular tests help you monitor your health and detect issues early.
              </p>
              
              {/* Graphic Mockup (Line chart illustration) */}
              <div className="w-full h-16 bg-white dark:bg-navy-800 border border-slate-200 dark:border-white/10 rounded-lg flex items-center justify-center relative overflow-hidden">
                <svg className="w-full h-full px-2" viewBox="0 0 100 40">
                  <path d="M0 30 Q20 15 40 25 T80 10 T100 20" fill="none" stroke="url(#gradient)" strokeWidth="2.5" />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#4f46e5" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                  <circle cx="40" cy="25" r="3" fill="#4f46e5" />
                  <circle cx="80" cy="10" r="3" fill="#06b6d4" />
                </svg>
                <span className="absolute bottom-1 right-2 px-1 py-0.5 rounded text-[8px] bg-emerald-500/10 text-emerald-500 font-extrabold border border-emerald-500/20">Good</span>
              </div>
            </div>

            <div className="space-y-2.5">
              {[
                { title: 'Stay ahead with regular tests', desc: 'Early detection leads to better outcomes.' },
                { title: 'Compare your results', desc: 'Track changes and progress over time.' },
                { title: 'Get expert recommendations', desc: 'Personalized insights from our specialists.' }
              ].map(ins => (
                <div key={ins.title} className="flex gap-2.5 items-start">
                  <div className="w-5 h-5 rounded-full bg-aura-500/10 flex items-center justify-center shrink-0 text-aura-500 mt-0.5">
                    <CheckCircle size={10} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{ins.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{ins.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => alert('Navigating to Clinical Health Records')}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-xs font-semibold text-aura-500 dark:text-aura-400 transition"
            >
              <FileText size={13} />
              View Health Records
            </button>
          </div>
        </div>
      </div>

      {/* Book Lab Test Modal */}
      {bookingModalOpen && selectedTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-navy-800 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-2xl p-6 animate-scale-up">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                  <FlaskConical size={16} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Schedule Diagnostic Test</h3>
              </div>
              <button onClick={() => setBookingModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400">
                <X size={18} />
              </button>
            </div>

            {bookingSuccess ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-aura-500/10 flex items-center justify-center mx-auto text-aura-500">
                  <CheckCircle size={24} />
                </div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Lab Test Scheduled</h4>
                <p className="text-xs text-slate-400 dark:text-slate-500">A slot has been booked for you. Please visit the clinic lab on <span className="font-semibold">{bookingDate}</span> at <span className="font-semibold">{bookingTime}</span> for specimen collection.</p>
              </div>
            ) : (
              <form onSubmit={handleBookTest} className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{selectedTest.name}</h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Code: {selectedTest.code} • Category: {selectedTest.category}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Collection Date</label>
                    <input
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      required
                      className="w-full px-4 py-2 rounded-xl text-sm bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-aura-500 transition"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Preferred Time</label>
                    <input
                      type="time"
                      value={bookingTime}
                      onChange={(e) => setBookingTime(e.target.value)}
                      required
                      className="w-full px-4 py-2 rounded-xl text-sm bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-aura-500 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Notes / Medical Indication (Optional)</label>
                  <textarea
                    rows={3}
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder="Mention any symptoms, active prescriptions or instruction from your doctor..."
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-aura-500 transition resize-none"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Test Price</span>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">₹{Number(selectedTest.price || 0).toFixed(2)}</p>
                  </div>
                  <button
                    type="submit"
                    disabled={bookingStatus === 'booking'}
                    className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-aura-600 hover:bg-aura-700 text-white transition flex items-center gap-1.5"
                  >
                    <Calendar size={14} />
                    {bookingStatus === 'booking' ? 'Booking...' : 'Confirm Book'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
