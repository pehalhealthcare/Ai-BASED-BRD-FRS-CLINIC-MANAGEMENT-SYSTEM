import { useEffect, useState } from 'react';
import { FlaskConical, Search, Clock, Droplet, ClipboardList, CheckCircle, AlertCircle, Calendar, X } from 'lucide-react';
import { labApi } from '../../lib/api';
import useAuth from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { FullPageSpinner } from '../../components/ui/Spinner';

const LabTestsPage = () => {
  const { user } = useAuth();
  const [labTests, setLabTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

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
    const fetchLabTests = async () => {
      try {
        setLoading(true);
        const response = await labApi.listTests({ limit: 50, isActive: true });
        setLabTests(response.data?.labTests || response.labTests || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch lab test catalog.');
      } finally {
        setLoading(false);
      }
    };
    fetchLabTests();
  }, []);

  const handleBookTest = (e) => {
    e.preventDefault();
    if (!selectedTest) return;
    setBookingStatus('booking');

    // Simulate scheduling a lab test booking request
    setTimeout(() => {
      setBookingStatus('success');
      setBookingSuccess(true);
      setTimeout(() => {
        setBookingSuccess(false);
        setBookingModalOpen(false);
        setSelectedTest(null);
        setBookingNotes('');
        setBookingStatus('');
      }, 2500);
    }, 1200);
  };

  const categories = ['All', ...new Set(labTests.map(t => t.category).filter(Boolean))];

  const filteredTests = labTests.filter(test => {
    const matchesSearch = test.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          test.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || test.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) return <FullPageSpinner message="Retrieving the Lab Diagnostics catalog..." />;

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6 animate-fade-in">
      {/* Header Panel */}
      <div className="relative overflow-hidden rounded-2xl p-6 bg-[#060d18] dark:bg-navy-900 border border-white/[0.06]">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-aura-500/10 blur-3xl" />
          <div className="absolute -bottom-16 -left-10 w-64 h-64 rounded-full bg-indigo-600/10 blur-3xl" />
        </div>

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-aura-400">AuraCare Labs</p>
            <h1 className="text-2xl md:text-3xl font-bold text-white mt-1">Lab Tests & Screenings</h1>
            <p className="text-sm text-slate-400 mt-2 max-w-xl">
              Explore available diagnostic tests, reference ranges, and request screening services directly with sample collection.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Catalog Control Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-navy-800 p-4 rounded-2xl border border-slate-200 dark:border-white/[0.08]">
        {/* Search */}
        <div className="relative w-full sm:flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by test name, code or category..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-aura-500 transition"
          />
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto w-full sm:w-auto py-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-aura-600 text-white shadow-sm'
                  : 'bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Lab Tests Grid */}
      {filteredTests.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTests.map((test) => (
            <Card
              key={test._id}
              className="hover:border-aura-400 dark:hover:border-aura-500/40 hover:-translate-y-1 hover:shadow-elevated transition-all duration-300 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                    <FlaskConical size={20} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <Badge color="info">
                    {test.code}
                  </Badge>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white line-clamp-1">{test.name}</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider font-semibold">{test.category}</p>
                </div>

                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <Droplet size={14} className="text-rose-500" />
                    <span>Specimen: <strong className="text-slate-800 dark:text-slate-200">{test.specimenType || 'Serum'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-amber-500" />
                    <span>Turnaround: <strong className="text-slate-800 dark:text-slate-200">24 Hours</strong></span>
                  </div>
                  {test.normalRange?.text && (
                    <div className="flex items-start gap-2">
                      <ClipboardList size={14} className="text-indigo-500 mt-0.5" />
                      <span>Ref Range: <span className="text-slate-800 dark:text-slate-200 font-mono text-[11px]">{test.normalRange.text}</span></span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Lab Price</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">₹{Number(test.price || 0).toFixed(2)}</p>
                </div>

                <button
                  onClick={() => {
                    setSelectedTest(test);
                    setBookingModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-aura-600 hover:bg-aura-700 text-white transition"
                >
                  Schedule Test
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-navy-800 rounded-2xl border border-slate-200 dark:border-white/[0.08]">
          <FlaskConical size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-base font-semibold text-slate-900 dark:text-white">No Diagnostic Tests Found</p>
          <p className="text-sm text-slate-400 mt-1">Try relaxing your search keywords or choosing another category.</p>
        </div>
      )}

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
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Notes / Medical Indication (Optional)</label>
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
};

export default LabTestsPage;
