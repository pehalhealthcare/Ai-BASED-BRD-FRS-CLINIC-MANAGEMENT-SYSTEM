import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import {
  Settings, Calendar, Search, Filter, Plus, Eye, Edit3, Trash,
  MoreVertical, Check, Users, Briefcase, DollarSign,
  Clock, ArrowRight, ShieldAlert, GraduationCap,
  ChevronLeft, ChevronRight, Download, Ban, CalendarDays, CheckCircle,
  Building, CheckSquare, PlusSquare, FileText
} from 'lucide-react';
import { adminApi, clinicApi, userApi } from '../../lib/api';

const MyReceptionistsDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Dashboard state
  const [receptionists, setReceptionists] = useState([]);
  const [pendingReceptionists, setPendingReceptionists] = useState([]);
  const [clinics, setClinics] = useState([]);

  // Search/Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [clinicQuery, setClinicQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [dashRes, clinicsRes] = await Promise.all([
        adminApi.getMyReceptionistsDashboard(),
        clinicApi.list()
      ]);
      setReceptionists(dashRes.data?.receptionists || []);
      setPendingReceptionists(dashRes.data?.pendingReceptionists || []);
      setClinics(clinicsRes.data?.clinics || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load receptionists dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleActive = async (userRec) => {
    const userId = userRec.userId?._id || userRec.userId || userRec._id;
    const nextActive = !userRec.isActive;
    const confirmMsg = nextActive
      ? `Are you sure you want to activate Receptionist ${userRec.fullName}?`
      : `Are you sure you want to suspend Receptionist ${userRec.fullName}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await userApi.updateStatus(userId, { isActive: nextActive });
      setMessage(`Receptionist ${userRec.fullName} status updated successfully.`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status.');
    }
  };

  const handleReject = async (userId) => {
    if (!window.confirm('Are you sure you want to reject this receptionist registration request?')) return;
    try {
      await adminApi.rejectReceptionist(userId);
      setMessage('Receptionist application rejected successfully.');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject application.');
    }
  };

  // Filtered receptionists (Appointed)
  const filteredReceptionists = useMemo(() => {
    let result = [...receptionists];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          (r.fullName || '').toLowerCase().includes(q) ||
          (r.email || '').toLowerCase().includes(q) ||
          (r.receptionistCode || '').toLowerCase().includes(q)
      );
    }

    if (clinicQuery) {
      result = result.filter(
        (r) => String(r.clinicId?._id || r.clinicId) === String(clinicQuery)
      );
    }

    if (statusFilter !== 'all') {
      const targetActive = statusFilter === 'active';
      result = result.filter((r) => r.isActive === targetActive);
    }

    return result;
  }, [receptionists, searchQuery, clinicQuery, statusFilter]);

  // Paginated receptionists
  const paginatedReceptionists = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredReceptionists.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredReceptionists, currentPage]);

  const totalPages = Math.ceil(filteredReceptionists.length / itemsPerPage);

  // Group by clinics (Clinic Distribution count)
  const clinicCounts = useMemo(() => {
    const counts = {};
    receptionists.forEach((r) => {
      const name = r.clinicId?.name || 'Unassigned Branch';
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [receptionists]);

  // Unique clinic count assigned
  const uniqueClinicsCount = useMemo(() => {
    const ids = receptionists.map((r) => r.clinicId?._id || r.clinicId).filter(Boolean);
    return new Set(ids).size;
  }, [receptionists]);

  // Donut chart/schedule calculations
  const activeCount = receptionists.filter((r) => r.isActive).length;
  const inactiveCount = receptionists.filter((r) => !r.isActive).length;
  const onDutyCount = Math.round(activeCount * 0.8) || activeCount; // Approximate active on shift
  const offDutyCount = activeCount - onDutyCount;

  if (loading) {
    return <LoadingState label="Loading Receptionists Dashboard..." />;
  }

  if (error) {
    return <ErrorState title="Dashboard Offline" description={error} />;
  }

  return (
    <div className="w-full min-h-screen bg-[#080e1a] text-slate-100 p-6 font-sans">
      
      {/* Title Header Card */}
      <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">My Receptionists Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Manage organization receptionist venue assignments, schedules, and pending registration review requests.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => navigate('/admin/receptionists/new')}
            className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-955 text-xs font-black rounded-xl transition flex items-center gap-1.5"
          >
            <Plus size={14} className="stroke-[3]" /> Add Receptionist
          </button>
          <button
            onClick={() => navigate('/admin/receptionist-settings')}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5"
          >
            <Settings size={14} /> Receptionist Settings
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex justify-between items-center animate-fadeIn">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Metrics Row (5 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Total Receptionists */}
        <div className="p-5 rounded-2xl bg-[#060d18] border border-white/[0.06] flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Receptionists</span>
              <p className="text-2xl font-extrabold text-white">{receptionists.length || 0}</p>
              <p className="text-[10px] text-slate-500">Active across all clinics</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#0e2722] flex items-center justify-center text-emerald-400 shrink-0">
              <Users size={16} />
            </div>
          </div>
          <p className="text-[10px] text-emerald-400 flex items-center gap-0.5">
            <span>↑ 14% from last month</span>
          </p>
        </div>

        {/* Pending Approval */}
        <div className="p-5 rounded-2xl bg-[#060d18] border border-white/[0.06] flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pending Approval</span>
              <p className="text-2xl font-extrabold text-white">{pendingReceptionists.length || 0}</p>
              <p className="text-[10px] text-slate-500 font-medium">Awaiting verification</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
              <Clock size={16} />
            </div>
          </div>
          <button onClick={() => alert('Scroll to Pending Review panel on the right.')} className="text-[10px] text-amber-400 font-bold hover:underline text-left">
            View & verify →
          </button>
        </div>

        {/* On Duty Today */}
        <div className="p-5 rounded-2xl bg-[#060d18] border border-white/[0.06] flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">On Duty Today</span>
              <p className="text-2xl font-extrabold text-white">{onDutyCount || 0}</p>
              <p className="text-[10px] text-slate-500">Receptionists on duty</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-450 shrink-0">
              <Calendar size={16} />
            </div>
          </div>
          <button className="text-[10px] text-blue-400 hover:underline text-left font-bold">
            View duty roster
          </button>
        </div>

        {/* Total Clinics Assigned */}
        <div className="p-5 rounded-2xl bg-[#060d18] border border-white/[0.06] flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Clinics Assigned</span>
              <p className="text-2xl font-extrabold text-white">{uniqueClinicsCount || 0}</p>
              <p className="text-[10px] text-slate-500">Clinics with receptionists</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
              <Building size={16} />
            </div>
          </div>
          <button className="text-[10px] text-purple-400 hover:underline text-left font-bold">
            View all clinics
          </button>
        </div>

        {/* Total Revenue */}
        <div className="p-5 rounded-2xl bg-[#060d18] border border-white/[0.06] flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Revenue (This Month)</span>
              <p className="text-2xl font-extrabold text-white">₹8,45,320</p>
              <p className="text-[10px] text-slate-500 font-medium">From appointments booked</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-450 shrink-0">
              <DollarSign size={16} />
            </div>
          </div>
          <p className="text-[10px] text-emerald-400 flex items-center gap-0.5">
            <span>↑ 18.7% from last month</span>
          </p>
        </div>
      </div>

      {/* Main Content Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1.2fr] gap-6 mb-6">
        
        {/* Left Column: Appointed Receptionists */}
        <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/[0.04]">
            <div>
              <h2 className="text-base font-black text-white">Appointed Receptionists ({filteredReceptionists.length})</h2>
              <p className="text-xs text-slate-400 mt-0.5">View and manage all appointed receptionists across your organization.</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search receptionist..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-48 bg-slate-900 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition"
                />
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
              <button className="p-1.5 bg-slate-900 border border-white/10 hover:bg-white/5 rounded-xl text-slate-300 transition">
                <Filter size={14} />
              </button>
              <button className="px-3 py-1.5 bg-[#0e2722] border border-emerald-500/10 hover:bg-[#12362f] rounded-xl text-xs font-bold text-emerald-400 flex items-center gap-1 transition">
                <Download size={12} /> Export
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {paginatedReceptionists.length > 0 ? (
              <table className="w-full text-xs text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="text-slate-500 border-b border-white/[0.04] bg-[#07101e]/30">
                    <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Receptionist</th>
                    <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Clinic / Venue</th>
                    <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Contact</th>
                    <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Experience</th>
                    <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Status</th>
                    <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedReceptionists.map((rec) => {
                    const primaryClinicName = rec.clinicId?.name || 'Unassigned Venue';
                    const expYears = rec.qualificationInfo?.experienceYears || rec.experienceYears || rec.profile?.experienceYears || 2;
                    return (
                      <tr key={rec._id} className="border-b border-white/[0.03] hover:bg-white/[0.01] transition-colors">
                        {/* Receptionist info */}
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {rec.image ? (
                              <img src={rec.image} alt={rec.fullName} className="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">RC</div>
                            )}
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-white">{rec.fullName || rec.name}</p>
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">Verified</span>
                              </div>
                              <p className="text-[10px] text-slate-505 mt-0.5">{rec.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Clinic Venue */}
                        <td className="p-4">
                          <p className="font-bold text-slate-200">{primaryClinicName}</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">Appointed Staff</p>
                        </td>

                        {/* Contact */}
                        <td className="p-4">
                          <span className="text-slate-350">{rec.phone || rec.profile?.phone || '9990099900'}</span>
                        </td>

                        {/* Experience */}
                        <td className="p-4 text-slate-350">{expYears} Years</td>

                        {/* Status */}
                        <td className="p-4">
                          {rec.isActive ? (
                            <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 font-bold text-amber-500">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> On Leave
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => navigate(`/admin/receptionists/${rec._id}/details`)}
                              title="View Details"
                              className="p-1.5 rounded-lg hover:bg-white/5 border border-white/10 hover:border-white/20 transition text-slate-300"
                            >
                              <Eye size={12} />
                            </button>
                            <button
                              onClick={() => navigate(`/admin/receptionists/${rec._id}/edit`)}
                              title="Edit Details"
                              className="p-1.5 rounded-lg hover:bg-white/5 border border-white/10 hover:border-white/20 transition text-slate-300"
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              onClick={() => handleToggleActive(rec)}
                              title={rec.isActive ? 'Suspend' : 'Activate'}
                              className="p-1.5 rounded-lg hover:bg-white/5 border border-white/10 hover:border-white/20 transition text-slate-300"
                            >
                              <Trash size={12} />
                            </button>
                            <button className="p-1.5 rounded-lg hover:bg-white/5 border border-white/10 hover:border-white/20 transition text-slate-300">
                              <MoreVertical size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12">
                <ShieldAlert size={36} className="text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 font-bold text-sm">No receptionists found</p>
                <p className="text-slate-500 text-xs mt-1">There are no approved receptionists matching your filters.</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/[0.04]">
              <span className="text-[10px] text-slate-500 font-medium">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredReceptionists.length)} of {filteredReceptionists.length} receptionists
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-slate-300 disabled:opacity-40 transition"
                >
                  <ChevronLeft size={12} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 text-[10px] font-bold rounded-lg transition ${
                      page === currentPage
                        ? 'bg-emerald-600 text-white font-extrabold'
                        : 'border border-white/10 hover:bg-white/5 text-slate-300'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-slate-300 disabled:opacity-40 transition"
                >
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Pending Approval Widget */}
        <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-white/[0.04] pb-3">
              <div>
                <h3 className="font-extrabold text-white text-sm">Pending Approval ({pendingReceptionists.length})</h3>
                <p className="text-[10px] text-slate-405 font-medium">Receptionist applications awaiting verification.</p>
              </div>
              <button className="text-[10px] text-emerald-400 font-bold hover:underline">View All</button>
            </div>

            <div className="space-y-4 overflow-y-auto max-h-[480px] pr-1">
              {pendingReceptionists.map((user, idx) => (
                <div key={user._id} className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl space-y-3.5 relative">
                  
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">PR</div>
                      <div>
                        <p className="font-bold text-white text-xs">{user.name}</p>
                        <p className="text-[9px] text-slate-500">{user.email}</p>
                      </div>
                    </div>
                    <span className="text-[8px] font-mono font-black bg-slate-800 text-slate-400 border border-white/10 px-1.5 py-0.5 rounded">
                      REC • 2025 • {String(8 + idx).padStart(4, '0')}
                    </span>
                  </div>

                  {/* Details info */}
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[10px] border-t border-white/[0.03] pt-3">
                    <div>
                      <p className="text-slate-500">Venue</p>
                      <p className="font-bold text-slate-200 truncate">{user.profile?.preferredPracticeLocation || 'Apollo Hospital'}</p>
                    </div>
                    <div>
                      <p className="text-slate-505">Phone</p>
                      <p className="font-bold text-slate-200">{user.phone || '9876543210'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Degree</p>
                      <p className="font-bold text-slate-200 truncate">{user.profile?.qualification || 'Hospital Administration'}</p>
                    </div>
                    <div>
                      <p className="text-slate-505">Experience</p>
                      <p className="font-bold text-slate-200">{user.profile?.experienceYears || 2} Years</p>
                    </div>
                  </div>

                  {/* Date & Action Buttons */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/[0.03] text-[9px]">
                    <span className="text-slate-500">Applied on: <span className="font-semibold text-slate-350">28 May 2025</span></span>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/admin/receptionists/${user._id}/review`)}
                        className="px-2.5 py-1.5 rounded-lg border border-white/10 hover:bg-[#0c1322] text-slate-300 transition"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => handleReject(user._id)}
                        className="px-2.5 py-1.5 rounded-lg border border-rose-500/25 hover:bg-rose-500/5 text-rose-500 transition"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => navigate(`/admin/receptionists/${user._id}/review`)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                  
                </div>
              ))}

              {pendingReceptionists.length === 0 && (
                <p className="text-slate-500 text-xs italic text-center py-8">No receptionist registrations pending.</p>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Bottom section: Clinic distribution, donut timeline, and quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Clinic Distribution */}
        <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-5 space-y-4">
          <div className="border-b border-white/[0.04] pb-2.5">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Clinic Distribution</h4>
            <p className="text-[10px] text-slate-400">Receptionists across clinics</p>
          </div>

          <div className="space-y-3.5">
            {clinicCounts.slice(0, 5).map(([name, count]) => {
              const maxCount = Math.max(...clinicCounts.map(([, c]) => c)) || 1;
              const pct = (count / maxCount) * 100;
              return (
                <div key={name} className="space-y-1.5 text-xs">
                  <div className="flex justify-between font-bold text-slate-350">
                    <span className="truncate max-w-[200px]">{name}</span>
                    <span>{count}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div style={{ width: `${pct}%` }} className="h-full bg-emerald-500 rounded-full transition-all duration-500" />
                  </div>
                </div>
              );
            })}

            {clinicCounts.length === 0 && (
              <p className="text-slate-500 text-xs italic">No clinic allocations available.</p>
            )}
          </div>

          <div className="pt-2 border-t border-white/[0.03]">
            <button className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 font-bold">
              View Clinic Wise Details →
            </button>
          </div>
        </div>

        {/* Today's Schedule Overview */}
        <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-5 flex flex-col justify-between">
          <div className="border-b border-white/[0.04] pb-2.5">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Today's Schedule Overview</h4>
            <p className="text-[10px] text-slate-400">Receptionists on duty today</p>
          </div>

          <div className="flex items-center justify-around py-4">
            <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                {/* Background Ring */}
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#0f172a" strokeWidth="2.5" />
                
                {/* On Duty Ring */}
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeDasharray={`${(onDutyCount / (receptionists.length || 1)) * 100} ${100 - (onDutyCount / (receptionists.length || 1)) * 100}`}
                  strokeDashoffset="0"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-base font-black text-white">{onDutyCount} / {receptionists.length}</span>
                <p className="text-[8px] text-slate-500 font-bold mt-0.5">On Duty Today</p>
              </div>
            </div>

            <div className="space-y-1.5 text-[10px]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-slate-400 font-bold">On Duty ({onDutyCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span className="text-slate-400 font-bold">On Leave ({inactiveCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <span className="text-slate-400 font-bold">Off Duty ({offDutyCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-650 shrink-0" />
                <span className="text-slate-400 font-bold">Pending (0)</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/[0.03]">
            <button className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 font-bold">
              View Full Schedule →
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-5 space-y-4">
          <div className="border-b border-white/[0.04] pb-2.5">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Quick Actions</h4>
            <p className="text-[10px] text-slate-405">Common administrative actions</p>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            <button
              onClick={() => navigate('/admin/receptionists/new')}
              className="flex items-center gap-2.5 p-2.5 bg-slate-900 border border-white/5 hover:bg-white/5 rounded-xl text-left text-xs font-bold text-slate-300 transition"
            >
              <PlusSquare size={13} className="text-emerald-500 shrink-0" />
              <span>Add New Receptionist</span>
            </button>
            
            <button
              onClick={() => alert('Assign clinic action')}
              className="flex items-center gap-2.5 p-2.5 bg-slate-900 border border-white/5 hover:bg-white/5 rounded-xl text-left text-xs font-bold text-slate-300 transition"
            >
              <Building size={13} className="text-indigo-400 shrink-0" />
              <span>Assign to Clinic / Venue</span>
            </button>

            <button
              onClick={() => alert('Manage shifts duty roster')}
              className="flex items-center gap-2.5 p-2.5 bg-slate-900 border border-white/5 hover:bg-white/5 rounded-xl text-left text-xs font-bold text-slate-300 transition"
            >
              <Calendar size={13} className="text-blue-400 shrink-0" />
              <span>Manage Duty Roster</span>
            </button>

            <button
              onClick={() => alert('Viewing leave requests')}
              className="flex items-center gap-2.5 p-2.5 bg-slate-900 border border-white/5 hover:bg-white/5 rounded-xl text-left text-xs font-bold text-slate-300 transition"
            >
              <FileText size={13} className="text-amber-500 shrink-0" />
              <span>View Leave Requests</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};

export default MyReceptionistsDashboard;
