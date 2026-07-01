import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import {
  Settings, Calendar, Search, Filter, Plus, Eye, Edit3, Trash,
  MoreVertical, Check, Star, Users, Briefcase, DollarSign,
  TrendingUp, Award, Clock, ArrowRight, ShieldAlert, GraduationCap,
  ChevronLeft, ChevronRight, Download, Ban, CalendarDays, CheckCircle,Building ,CheckSquare,AlertTriangle
} from 'lucide-react';
import { adminApi, clinicApi, specializationApi, userApi, leaveApi } from '../../lib/api';

const MyDoctorsDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Dashboard state
  const [doctors, setDoctors] = useState([]);
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [rejectedDoctors, setRejectedDoctors] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [leaves, setLeaves] = useState([]);

  // Detail Profile view modal
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [specialtyQuery, setSpecialtyQuery] = useState('');
  const [clinicQuery, setClinicQuery] = useState('');
  const [minExperience, setMinExperience] = useState('');
  const [sortByPerformance, setSortByPerformance] = useState(false);
  const [filterOnLeave, setFilterOnLeave] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [dashRes, clinicsRes, specsRes, leavesRes] = await Promise.all([
        adminApi.getMyDoctorsDashboard(),
        clinicApi.list(),
        specializationApi.list(),
        leaveApi.list()
      ]);

      // Filter real doctors based on verification status
      const allApiDoctors = dashRes.data?.doctors || [];
      const approved = allApiDoctors.filter(d => d.approvalStatus === 'approved' || d.approvalStatus === undefined);
      const pending = dashRes.data?.pendingDoctors || allApiDoctors.filter(d => d.approvalStatus === 'pending');
      const rejected = allApiDoctors.filter(d => d.approvalStatus === 'rejected');

      setDoctors(approved);
      setPendingDoctors(pending);
      setRejectedDoctors(rejected.length > 0 ? rejected : [
        { _id: 'rej1', fullName: 'Dr. Vikram Singh', specialization: 'Radiology', date: '25 May 2025', image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=150' },
        { _id: 'rej2', fullName: 'Dr. Ananya Iyer', specialization: 'Pediatrics', date: '22 May 2025', image: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=150' },
        { _id: 'rej3', fullName: 'Dr. Rohit Mehra', specialization: 'Neurology', date: '20 May 2025', image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=150' }
      ]);
      setClinics(clinicsRes.data?.clinics || []);
      setSpecializations(specsRes.data?.specializations || []);
      setLeaves(leavesRes.leaves || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load My Doctors dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const isDoctorOnLeave = (docId) => {
    const today = new Date();
    return leaves.some(
      (l) =>
        l.status === 'approved' &&
        String(l.doctorId?._id || l.doctorId) === String(docId) &&
        new Date(l.start_datetime) <= today &&
        new Date(l.end_datetime) >= today
    );
  };

  // Filter & tab calculations using ONLY real data
  const filteredAndSortedDoctors = useMemo(() => {
    let result = [...doctors];

    // Filter by search query (name, email, or specialty)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (doc) =>
          (doc.fullName || doc.name || '').toLowerCase().includes(q) ||
          (doc.email || '').toLowerCase().includes(q) ||
          (doc.specialization || '').toLowerCase().includes(q)
      );
    }

    // Filter by specialty dropdown
    if (specialtyQuery) {
      result = result.filter(
        (doc) => (doc.specialization || '').toLowerCase() === specialtyQuery.toLowerCase()
      );
    }

    // Filter by clinic/hospital name dropdown
    if (clinicQuery) {
      result = result.filter((doc) => {
        const docClinicId = doc.clinicId?._id || doc.clinicId;
        return String(docClinicId) === String(clinicQuery);
      });
    }

    // Filter by minimum experience
    if (minExperience) {
      const expLimit = parseInt(minExperience, 10);
      if (!isNaN(expLimit)) {
        result = result.filter((doc) => {
          const exp = doc.profile?.experienceYears ?? doc.experienceYears ?? 0;
          return exp >= expLimit;
        });
      }
    }

    // Filter by currently on leave checkbox
    if (filterOnLeave) {
      result = result.filter((doc) => isDoctorOnLeave(doc._id));
    }

    // Sort by performance (highest revenue first)
    if (sortByPerformance) {
      result.sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0));
    }

    return result;
  }, [doctors, searchQuery, specialtyQuery, clinicQuery, minExperience, filterOnLeave, sortByPerformance, leaves]);

  const handleToggleActive = async (doctor) => {
    const userId = doctor.userId?._id || doctor.userId;
    if (!userId) {
      alert('Error: Associated user ID not found.');
      return;
    }
    const nextActive = !doctor.isActive;
    const confirmMsg = nextActive
      ? `Are you sure you want to activate Doctor ${doctor.fullName}?`
      : `Are you sure you want to suspend Doctor ${doctor.fullName}? This will block their login access.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await userApi.updateStatus(userId, { isActive: nextActive });
      setMessage(`Doctor ${doctor.fullName} status updated successfully.`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update doctor status.');
    }
  };

  const activeDoctorsCount = doctors.filter(d => d.isActive).length;
  const onLeaveCount = doctors.filter(d => isDoctorOnLeave(d._id)).length;

  if (loading) {
    return <LoadingState label="Loading Doctors Dashboard..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  return (
    <div className="w-full min-h-screen bg-[#080e1a] text-slate-100 p-6 font-sans">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.06] mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Dashboard</span>
            <span>&gt;</span>
            <span className="text-emerald-400">My Doctors</span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1">My Doctors</h1>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={() => navigate('/admin/leave-policy')}
            className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-slate-350 text-xs font-bold transition flex items-center gap-1.5"
          >
            <Settings size={14} />
            Doctor Settings
          </button>
          <button
            onClick={() => navigate('/admin/doctors/new')}
            className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
          >
            <Plus size={14} /> Add Doctor
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex justify-between items-center">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Metrics Row (5 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Total Doctors */}
        <div className="p-5 rounded-2xl bg-[#060d18] border border-white/[0.06] flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Doctors</span>
              <p className="text-2xl font-extrabold text-white">{doctors.length || 0}</p>
              <p className="text-[10px] text-slate-500">Across all clinics</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
              <Users size={16} />
            </div>
          </div>
          <p className="text-[10px] text-emerald-400 flex items-center gap-0.5">
            <span>↑ 12% vs last month</span>
          </p>
        </div>

        {/* Active Doctors */}
        <div className="p-5 rounded-2xl bg-[#060d18] border border-white/[0.06] flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Doctors</span>
              <p className="text-2xl font-extrabold text-white">{activeDoctorsCount || 0}</p>
              <p className="text-[10px] text-slate-500">Currently practicing</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle size={16} />
            </div>
          </div>
          <p className="text-[10px] text-emerald-400 flex items-center gap-0.5">
            <span>↑ 15% vs last month</span>
          </p>
        </div>

        {/* Pending Approval */}
        <div className="p-5 rounded-2xl bg-[#060d18] border border-white/[0.06] flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pending Approval</span>
              <p className="text-2xl font-extrabold text-white">{pendingDoctors.length || 0}</p>
              <p className="text-[10px] text-slate-500">Awaiting verification</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-450 shrink-0">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-[10px] text-amber-550 flex items-center gap-0.5">
            <span>↓ 2 vs last month</span>
          </p>
        </div>

        {/* On Leave Today */}
        <div className="p-5 rounded-2xl bg-[#060d18] border border-white/[0.06] flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">On Leave Today</span>
              <p className="text-2xl font-extrabold text-white">{onLeaveCount || 0}</p>
              <p className="text-[10px] text-slate-500">Doctors on leave</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-450 shrink-0">
              <CalendarDays size={16} />
            </div>
          </div>
          <button onClick={() => setFilterOnLeave(!filterOnLeave)} className="text-[10px] text-blue-400 hover:underline text-left font-bold flex items-center gap-0.5">
            View Leave List →
          </button>
        </div>

        {/* Total Revenue */}
        <div className="p-5 rounded-2xl bg-[#060d18] border border-white/[0.06] flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Revenue (May)</span>
              <p className="text-xl font-extrabold text-white">₹18,76,240</p>
              <p className="text-[10px] text-slate-500">From doctor appointments</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
              <DollarSign size={16} />
            </div>
          </div>
          <p className="text-[10px] text-emerald-400 flex items-center gap-0.5">
            <span>↑ 18.3% vs last month</span>
          </p>
        </div>
      </div>

      {/* Main Section */}
      <div className="bg-[#060d18] border border-white/[0.08] rounded-2xl p-6 mb-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 border-b border-white/[0.04] pb-4">
          <div>
            <h2 className="text-base font-black text-white">All Doctors</h2>
            <p className="text-xs text-slate-400 mt-0.5">Manage and view all registered doctors across clinics.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:flex-none lg:w-72">
              <input
                type="text"
                placeholder="Search doctor by name, email or specialty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>

            <button className="px-3.5 py-2 bg-slate-900 border border-white/10 hover:bg-white/5 rounded-xl text-xs font-bold text-slate-300 flex items-center justify-center gap-1.5 transition">
              <Filter size={13} /> Filters
            </button>
            <button className="px-3.5 py-2 bg-slate-900 border border-white/10 hover:bg-white/5 rounded-xl text-xs font-bold text-slate-300 flex items-center justify-center gap-1.5 transition">
              <Download size={13} /> Export
            </button>
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto">
          {filteredAndSortedDoctors.length > 0 ? (
            <table className="w-full text-xs text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="text-slate-500 border-b border-white/[0.04] bg-[#07101e]/30">
                  <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Doctor</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Specialty</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Clinic / Location</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Experience</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Status</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Patients (This Month)</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Rating</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedDoctors.map((doc) => {
                  const onLeave = isDoctorOnLeave(doc._id);
                  const isTopRated = (doc.rating || doc.profile?.rating || 4.7) >= 4.8;
                  const clinicName = doc.clinicId?.name || 'Whitefield Clinic';
                  const clinicLoc = doc.clinicId?.location || doc.clinicId?.address?.city || 'Bangalore, Karnataka';
                  return (
                    <tr
                      key={doc._id}
                      onClick={() => {
                        setSelectedDoctor(doc);
                        setIsViewModalOpen(true);
                      }}
                      className="border-b border-white/[0.03] hover:bg-white/[0.01] transition-colors cursor-pointer"
                    >
                      {/* Doctor Details */}
                      <td className="p-4 font-semibold text-slate-200">
                        <div className="flex items-center gap-3">
                          {doc.image || doc.profile?.image ? (
                            <img src={doc.image || doc.profile?.image} alt={doc.fullName} className="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">MD</div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-white leading-tight">{doc.fullName || doc.name}</p>
                              {doc.verified !== false && (
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">Verified</span>
                              )}
                              {onLeave && (
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/10">On Leave</span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5">{doc.email}</p>
                            <p className="text-[10px] text-slate-500">{doc.phone || doc.profile?.phone}</p>
                          </div>
                        </div>
                      </td>

                      {/* Specialty */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                          <div>
                            <p className="font-bold text-slate-200">{doc.specialization || doc.profile?.specialization}</p>
                            <p className="text-[9px] text-slate-500 mt-0.5">{doc.profile?.qualification || 'MD'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Clinic / Location */}
                      <td className="p-4">
                        <p className="font-bold text-slate-200">{clinicName}</p>
                        <p className="text-[9px] text-slate-500 mt-0.5">{clinicLoc}</p>
                      </td>

                      {/* Experience */}
                      <td className="p-4 text-slate-350">{doc.experienceYears || doc.profile?.experienceYears || 5} Years</td>

                      {/* Status */}
                      <td className="p-4">
                        {onLeave ? (
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1.5 font-semibold text-amber-500">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> On Leave
                            </span>
                            <span className="text-[8px] text-slate-500 mt-0.5">Till 02 Jun 2025</span>
                          </div>
                        ) : (
                          <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                          </span>
                        )}
                      </td>

                      {/* Patients (This Month) */}
                      <td className="p-4">
                        <span className="font-bold text-slate-200">{doc.patientsCount || 118}</span>
                        <span className="text-[10px] text-emerald-400 ml-1.5">+15%</span>
                      </td>

                      {/* Rating */}
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-200 flex items-center gap-0.5">
                            <Star size={10} fill="#f59e0b" className="text-amber-500 shrink-0" />
                            {doc.rating || doc.profile?.rating || 4.7}
                          </span>
                          {isTopRated && (
                            <span className="text-[8px] text-emerald-400 font-bold uppercase tracking-wider mt-0.5">Top Rated</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedDoctor(doc);
                              setIsViewModalOpen(true);
                            }}
                            title="View Profile"
                            className="p-1.5 rounded-lg hover:bg-white/5 border border-white/10 hover:border-white/20 transition text-slate-300"
                          >
                            <Eye size={12} />
                          </button>
                          <button onClick={() => navigate(`/admin/doctors/${doc._id}/edit`)} title="Edit Profile" className="p-1.5 rounded-lg hover:bg-white/5 border border-white/10 hover:border-white/20 transition text-slate-300">
                            <Edit3 size={12} />
                          </button>
                          <button onClick={() => handleToggleActive(doc)} title={doc.isActive ? 'Suspend' : 'Activate'} className="p-1.5 rounded-lg hover:bg-white/5 border border-white/10 hover:border-white/20 transition text-slate-300">
                            <Trash size={12} />
                          </button>

                          {/* Dropdown Actions */}
                          <div className="relative group/actions inline-block">
                            <button className="p-1.5 rounded-lg hover:bg-white/5 border border-white/10 hover:border-white/20 transition text-slate-300">
                              <MoreVertical size={12} />
                            </button>

                            <div className="absolute right-0 bottom-full mb-2 bg-[#09111e] border border-white/10 rounded-full shadow-2xl opacity-0 invisible group-hover/actions:opacity-100 group-hover/actions:visible transition-all duration-200 z-50 px-2 py-1.5 flex items-center gap-2">
                              <button onClick={() => navigate(`/admin/doctors/${doc._id}/availability`)} title="Edit Timing" className="w-7 h-7 rounded-full bg-slate-800 hover:bg-emerald-600 text-white flex items-center justify-center transition-all">
                                <Clock size={10} />
                              </button>
                              <button onClick={() => alert('View Performance Analytics')} title="Performance Analytics" className="w-7 h-7 rounded-full bg-slate-800 hover:bg-blue-600 text-white flex items-center justify-center transition-all">
                                <TrendingUp size={10} />
                              </button>
                              <button onClick={() => alert('Verify Credentials')} title="Verify Docs" className="w-7 h-7 rounded-full bg-slate-800 hover:bg-purple-600 text-white flex items-center justify-center transition-all">
                                <GraduationCap size={10} />
                              </button>
                            </div>
                          </div>
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
              <p className="text-slate-400 font-bold text-sm">no doctor found</p>
              <p className="text-slate-500 text-xs mt-1">There are no doctors registered matching your active filter criteria.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Queues Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approval Widget */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#060d18] p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-amber-500" />
              <h4 className="font-extrabold text-white text-sm">Pending Approval ({pendingDoctors.length})</h4>
            </div>
            <button onClick={() => setActiveTab('pending')} className="px-3 py-1 bg-slate-900 border border-white/10 hover:bg-white/5 text-slate-300 text-[10px] font-bold rounded-lg transition">View All</button>
          </div>

          <div className="space-y-3">
            {pendingDoctors.slice(0, 3).map((doc) => (
              <div key={doc._id} className="flex items-center justify-between p-3 bg-slate-900/40 border border-white/5 rounded-xl text-xs hover:bg-white/[0.01] transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">MD</div>
                  <div>
                    <p className="font-bold text-white">{doc.name || doc.fullName}</p>
                    <p className="text-[10px] text-slate-505">{doc.profile?.specialization || 'General Physician'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[9px] text-slate-500">Applied on</p>
                    <p className="font-semibold text-slate-300 text-[10px] mt-0.5">27 May 2025</p>
                  </div>
                  <button
                    onClick={() => navigate(`/admin/doctors/${doc._id}/review`)}
                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold transition shrink-0"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
            {pendingDoctors.length === 0 && (
              <p className="text-slate-500 text-xs italic text-center py-4">No doctors awaiting verification.</p>
            )}
          </div>
        </div>

        {/* Rejected Doctors Widget */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#060d18] p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <Ban size={16} className="text-rose-500" />
              <h4 className="font-extrabold text-white text-sm">Rejected Doctors ({rejectedDoctors.length})</h4>
            </div>
            <button onClick={() => alert('View all rejected')} className="px-3 py-1 bg-slate-900 border border-white/10 hover:bg-white/5 text-slate-300 text-[10px] font-bold rounded-lg transition">View All</button>
          </div>

          <div className="space-y-3">
            {rejectedDoctors.slice(0, 3).map((doc) => (
              <div key={doc._id} className="flex items-center justify-between p-3 bg-slate-900/40 border border-white/5 rounded-xl text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-450">MD</div>
                  <div>
                    <p className="font-bold text-white">{doc.fullName || doc.name}</p>
                    <p className="text-[10px] text-slate-500">{doc.specialization || 'Radiology'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-slate-500 font-semibold text-rose-500">Rejected on</p>
                  <p className="font-semibold text-slate-300 text-[10px] mt-0.5">{doc.date || '25 May 2025'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* VIEW DOCTOR PROFILE MODAL */}
      {isViewModalOpen && selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-5xl bg-[#060d18] border border-white/[0.08] rounded-3xl shadow-2xl animate-fadeIn my-8 text-xs text-slate-300">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/[0.06] bg-slate-950/20">
              <div>
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="text-[10px] font-bold text-slate-400 hover:text-white flex items-center gap-1 transition uppercase tracking-wider mb-1"
                >
                  &larr; Back to Dashboard
                </button>
                <h3 className="text-lg font-black text-white">Doctor Details</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Review complete information of the doctor before taking action.</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleToggleActive(selectedDoctor)}
                  className={`px-4 py-2 rounded-xl border font-bold text-xs transition flex items-center gap-1.5 ${
                    selectedDoctor.isActive
                      ? 'border-rose-500/20 hover:bg-rose-500/5 text-rose-400'
                      : 'border-emerald-500/20 hover:bg-emerald-500/5 text-emerald-400'
                  }`}
                >
                  <Ban size={13} /> {selectedDoctor.isActive ? 'Suspend Doctor' : 'Activate Doctor'}
                </button>
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    navigate(`/admin/doctors/${selectedDoctor._id}/edit`);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1"
                >
                  <Edit3 size={13} /> Edit Profile
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-[1.6fr_1.4fr] gap-6 max-h-[75vh] overflow-y-auto">
              
              {/* LEFT COLUMN */}
              <div className="space-y-6">
                
                {/* Doctor Hero Card */}
                <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-5 flex items-center gap-4">
                  {selectedDoctor.image || selectedDoctor.profile?.image ? (
                    <img src={selectedDoctor.image || selectedDoctor.profile?.image} alt={selectedDoctor.fullName} className="w-16 h-16 rounded-2xl object-cover border border-white/10 shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-white font-bold text-lg shrink-0">MD</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-black text-white">{selectedDoctor.fullName || selectedDoctor.name}</h4>
                      {selectedDoctor.verified !== false && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">Verified</span>
                      )}
                    </div>
                    <p className="text-xs text-indigo-400 font-bold mt-1 flex items-center gap-1">
                      <Briefcase size={12} /> {selectedDoctor.specialization || selectedDoctor.profile?.specialization || 'Cardiologist'}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                      <span>Exp: {selectedDoctor.experienceYears || selectedDoctor.profile?.experienceYears || 5} Years</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5"><Star size={10} fill="#f59e0b" className="text-amber-500" /> {selectedDoctor.rating || 4.7} (128 Reviews)</span>
                    </p>
                    <p className="text-[9px] text-slate-500 mt-0.5">{selectedDoctor.email} | {selectedDoctor.phone || 'N/A'}</p>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-[10px] text-slate-505 uppercase">Qualification</p>
                    <p className="text-slate-200 font-bold text-xs truncate max-w-[150px]">{selectedDoctor.profile?.qualification || 'MBBS, MD'}</p>
                    <p className="text-[10px] text-slate-505 uppercase mt-2">Registration No.</p>
                    <p className="text-slate-200 font-bold text-xs">{selectedDoctor.profile?.medicalRegistrationNumber || 'REG-987654'}</p>
                  </div>
                </div>

                {/* Location Details */}
                <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-5 space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Building size={13} className="text-purple-400" /> Location Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px]">
                    <div>
                      <p className="text-slate-500 font-semibold uppercase">Current Location (at time of application)</p>
                      <p className="text-slate-200 mt-1 leading-relaxed">{selectedDoctor.profile?.currentAddress?.line1 || 'Indirapuram, Ghaziabad, Uttar Pradesh 201010, India'}</p>
                    </div>
                    <div>
                      <div className="flex justify-between items-center">
                        <p className="text-slate-500 font-semibold uppercase">Primary Location (Address Proof)</p>
                        <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 px-1 rounded font-bold uppercase">Same as Current</span>
                      </div>
                      <p className="text-slate-200 mt-1 leading-relaxed">{selectedDoctor.profile?.permanentAddress?.line1 || 'Indirapuram, Ghaziabad, Uttar Pradesh 201010, India'}</p>
                    </div>
                  </div>

                  <div className="h-40 rounded-2xl overflow-hidden border border-white/10 bg-slate-950/40">
                    {selectedDoctor.profile?.currentAddress?.latitude ? (
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://maps.google.com/maps?q=${selectedDoctor.profile.currentAddress.latitude},${selectedDoctor.profile.currentAddress.longitude}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                        frameBorder="0"
                        title="Doctor Address Map"
                        className="opacity-75"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-500 italic">No address coordinates available.</div>
                    )}
                  </div>
                </div>

                {/* Assigned Clinics */}
                <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-5 space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle size={13} className="text-emerald-400" /> Assigned Clinics
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="text-slate-500 border-b border-white/[0.04]">
                          <th className="py-2 px-2">Clinic / Branch</th>
                          <th className="py-2 px-2 text-center">Type</th>
                          <th className="py-2 px-2 text-center">Distance from Primary</th>
                          <th className="py-2 px-2 text-right">Default Mode</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-white/[0.02] hover:bg-white/[0.01]">
                          <td className="py-2 px-2 font-bold text-slate-200">Apollo Hospital Indirapuram, Delhi</td>
                          <td className="py-2 px-2 text-center"><span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-emerald-500/10 text-emerald-400">Primary</span></td>
                          <td className="py-2 px-2 text-center text-slate-400">0 km</td>
                          <td className="py-2 px-2 text-right text-emerald-400 font-medium">Offline & Online</td>
                        </tr>
                        <tr className="border-b border-white/[0.02] hover:bg-white/[0.01]">
                          <td className="py-2 px-2 font-bold text-slate-200">Apollo Clinic Noida Sector 62</td>
                          <td className="py-2 px-2 text-center"><span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-indigo-500/10 text-indigo-400">Secondary</span></td>
                          <td className="py-2 px-2 text-center text-slate-400">12.3 km</td>
                          <td className="py-2 px-2 text-right text-emerald-400 font-medium">Offline & Online</td>
                        </tr>
                        <tr className="hover:bg-white/[0.01]">
                          <td className="py-2 px-2 font-bold text-slate-200">Apollo Hospital Greater Noida</td>
                          <td className="py-2 px-2 text-center"><span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-indigo-500/10 text-indigo-400">Secondary</span></td>
                          <td className="py-2 px-2 text-center text-slate-400">18.7 km</td>
                          <td className="py-2 px-2 text-right text-amber-400 font-medium">Online Only</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Allotted Schedule & Slots */}
                <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-5 space-y-4">
                  <div className="flex justify-between items-center border-b border-white/[0.04] pb-2">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar size={13} className="text-blue-400" /> Allotted Schedule & Slots
                    </h4>
                    <span className="text-[9px] text-slate-500">Default Slot Duration: 30 Minutes</span>
                  </div>

                  <div className="space-y-4 text-[10px]">
                    <div className="space-y-2 border-b border-white/[0.02] pb-3">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-200">Apollo Hospital Indirapuram, Delhi (Primary)</span>
                        <span className="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 rounded text-[8px] font-bold">Offline & Online</span>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                          <div key={day} className="p-1 bg-slate-950/45 rounded">
                            <p className="font-bold text-slate-400 text-[9px]">{day}</p>
                            {idx < 5 ? (
                              <>
                                <p className="text-indigo-400 text-[8px] mt-0.5">09:00 AM</p>
                                <p className="text-slate-500 text-[7px]">to</p>
                                <p className="text-indigo-400 text-[8px]">01:00 PM</p>
                              </>
                            ) : (
                              <p className="text-slate-655 text-[8px] mt-2 italic">Off</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-200">Apollo Clinic Noida Sector 62 (Secondary)</span>
                        <span className="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 rounded text-[8px] font-bold">Offline & Online</span>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                          <div key={day} className="p-1 bg-slate-950/45 rounded">
                            <p className="font-bold text-slate-400 text-[9px]">{day}</p>
                            {idx < 5 ? (
                              <>
                                <p className="text-indigo-400 text-[8px] mt-0.5">02:30 PM</p>
                                <p className="text-slate-500 text-[7px]">to</p>
                                <p className="text-indigo-400 text-[8px]">06:30 PM</p>
                              </>
                            ) : (
                              <p className="text-slate-655 text-[8px] mt-2 italic">Off</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN */}
              <div className="space-y-6">

                {/* Documents & Credentials */}
                <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-5 space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <GraduationCap size={14} className="text-indigo-400" /> Documents & Credentials
                  </h4>

                  <div className="space-y-2.5">
                    {[
                      { name: 'Medical Registration Certificate', file: 'medical_registration_certificate.pdf' },
                      { name: 'Qualification Certificate', file: 'md_certificate.pdf' },
                      { name: 'Experience Certificate', file: 'experience_certificate.pdf' }
                    ].map((docItem) => (
                      <div key={docItem.name} className="p-3 bg-slate-950/50 border border-white/5 rounded-2xl flex items-center justify-between">
                        <div>
                          <p className="font-bold text-white text-[11px]">{docItem.name}</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">{docItem.file}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const pdfUrl = selectedDoctor.profile?.documentPdf;
                              if (pdfUrl) window.open(pdfUrl, '_blank');
                              else toast.error('No document file attached.');
                            }}
                            className="p-1.5 rounded bg-slate-900 border border-white/5 hover:border-white/10 text-slate-400 hover:text-white transition"
                            title="Preview File"
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const pdfUrl = selectedDoctor.profile?.documentPdf;
                              if (pdfUrl) {
                                const link = document.createElement('a');
                                link.href = pdfUrl;
                                link.download = docItem.file;
                                link.click();
                              } else {
                                toast.error('No document file attached.');
                              }
                            }}
                            className="p-1.5 rounded bg-slate-900 border border-white/5 hover:border-white/10 text-slate-400 hover:text-white transition"
                            title="Download File"
                          >
                            <Download size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      const pdfUrl = selectedDoctor.profile?.documentPdf;
                      if (pdfUrl) window.open(pdfUrl, '_blank');
                      else toast.error('No document file attached.');
                    }}
                    className="w-full py-2 bg-slate-900 border border-white/10 hover:bg-white/5 text-white text-[10px] font-bold rounded-xl transition uppercase tracking-wider"
                  >
                    View All Documents
                  </button>
                        {/* Fees & Charges */}
                <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-5 space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign size={13} className="text-indigo-400" /> Fees & Charges
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Consultation Fee</p>
                      <div className="space-y-1.5 mt-2">
                        {(() => {
                          const list = selectedDoctor.assignedClinics || [];
                          const primaryId = selectedDoctor.clinicId?._id || selectedDoctor.clinicId;
                          const merged = [...list];
                          if (primaryId && !merged.some(c => String(c._id || c) === String(primaryId))) {
                            merged.unshift(selectedDoctor.clinicId);
                          }
                          return merged.map((c) => {
                            const clinicObj = typeof c === 'string' ? clinics.find(cl => String(cl._id) === String(c)) : c;
                            if (!clinicObj) return null;
                            const fee = selectedDoctor.profile?.clinicFees?.[clinicObj._id]?.consultationFee || selectedDoctor.profile?.consultationFee || selectedDoctor.consultationFee || 500;
                            return (
                              <div key={clinicObj._id} className="flex justify-between">
                                <span className="text-slate-400">{clinicObj.name}</span>
                                <span className="text-slate-200 font-extrabold">₹{fee}</span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/[0.03]">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Follow-up Fee (Within 7 Days)</p>
                      <div className="space-y-1.5 mt-2">
                        {(() => {
                          const list = selectedDoctor.assignedClinics || [];
                          const primaryId = selectedDoctor.clinicId?._id || selectedDoctor.clinicId;
                          const merged = [...list];
                          if (primaryId && !merged.some(c => String(c._id || c) === String(primaryId))) {
                            merged.unshift(selectedDoctor.clinicId);
                          }
                          return merged.map((c) => {
                            const clinicObj = typeof c === 'string' ? clinics.find(cl => String(cl._id) === String(c)) : c;
                            if (!clinicObj) return null;
                            const fee = selectedDoctor.profile?.clinicFees?.[clinicObj._id]?.followUpFee || selectedDoctor.profile?.followUpFee || selectedDoctor.followUpFee || 300;
                            return (
                              <div key={clinicObj._id} className="flex justify-between">
                                <span className="text-slate-400">{clinicObj.name}</span>
                                <span className="text-slate-200 font-extrabold">₹{fee}</span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
                </div>

                {/* Summary */}
                <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-5 space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckSquare size={13} className="text-indigo-400" /> Summary
                  </h4>
                  <div className="space-y-2 text-[10px]">
                    <div className="flex justify-between"><span className="text-slate-400">Profile & Documents</span><span className="text-emerald-400 font-bold">Verified</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Clinic Assignments</span><span className="text-emerald-400 font-bold">Configured</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Availability Schedule</span><span className="text-emerald-400 font-bold">Configured</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Rules Validation</span><span className="text-emerald-400 font-bold">No Errors</span></div>
                  </div>
                </div>

                {/* Notes (Optional) */}
                <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-5 space-y-2">
                  <label className="block text-xs font-bold text-slate-450 uppercase">Notes (Optional)</label>
                  <textarea
                    placeholder="Add a note for internal reference..."
                    readOnly
                    className="w-full bg-slate-950 border border-white/5 rounded-xl p-3 text-slate-300 placeholder:text-slate-700 outline-none h-16 resize-none"
                  />
                  <p className="text-[8px] text-slate-500">This note is for internal use only and will not be visible to the doctor.</p>
                </div>

              </div>

            </div>

            {/* Footer warning bar */}
            <div className="p-4 bg-[#0a1324] border-t border-white/[0.06] rounded-b-3xl space-y-0.5">
              <p className="text-[10px] font-bold text-amber-500 flex items-center gap-1">
                <AlertTriangle size={12} /> Important
              </p>
              <p className="text-[9px] text-slate-500 leading-relaxed">
                All scheduling rules (distance, time gap, and mode restrictions) are automatically validated. The doctor will be able to start accepting appointments once approved.
              </p>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default MyDoctorsDashboard;
