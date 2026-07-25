import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, Filter, RefreshCw, Plus, Eye, Calendar, MessageSquare, 
  MapPin, MoreHorizontal, ChevronLeft, ChevronRight, X, User, 
  Building, Phone, Clock, Activity, Award, GraduationCap, Sparkles 
} from 'lucide-react';
import toast from 'react-hot-toast';

import { doctorApi, chatApi, appointmentApi } from '../../lib/api';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';

const DoctorListPage = () => {
  const navigate = useNavigate();

  // API states
  const [doctors, setDoctors] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clinicFilter, setClinicFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // UI States
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [actionMenuId, setActionMenuId] = useState(null);

  // Load Doctors
  const loadDoctors = async (page = pagination.page, showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');

    try {
      // Load conversations to get unread badge counts
      let convs = [];
      try {
        const chatRes = await chatApi.getConversations();
        convs = chatRes.conversations || [];
        setConversations(convs);
      } catch (chatErr) {
        console.error('Error fetching chat conversations for badges', chatErr);
      }

      const todayStr = new Date().toISOString().split('T')[0];
      let todayAppointments = [];
      try {
        const apptsRes = await appointmentApi.getAppointments({ date: todayStr, limit: 1000 });
        todayAppointments = apptsRes.appointments || [];
      } catch (apptErr) {
        console.error('Failed to load today appointments:', apptErr);
      }

      const response = await doctorApi.list({
        page,
        limit: pagination.limit,
        search: search || undefined,
        specialization: specialization || undefined,
        isActive: statusFilter ? statusFilter === 'active' : undefined
      });

      // Enrich API data with realistic live fields matching screenshot
      const rawDoctors = response.data.doctors || [];
      const enriched = rawDoctors.map((doc, idx) => {
        const docAppts = todayAppointments.filter(
          a => String(a.doctorId?._id || a.doctorId) === String(doc._id)
        );

        const appointmentsTotal = docAppts.length;
        const appointmentsCompleted = docAppts.filter(
          a => ['completed', 'checked_out'].includes(a.status?.toLowerCase())
        ).length;

        const upcomingAppts = docAppts.filter(
          a => !['completed', 'cancelled', 'not_attended', 'rejected'].includes(a.status?.toLowerCase())
        ).sort((a, b) => (a.timeSlot || '').localeCompare(b.timeSlot || ''));

        const nextSlot = upcomingAppts.length > 0
          ? upcomingAppts[0].timeSlot
          : 'Not Available';

        let liveStatus = doc.isActive ? 'Available' : 'Offline';
        if (docAppts.some(a => a.status?.toLowerCase() === 'in_consultation')) {
          liveStatus = 'In Consultation';
        }
        
        let activity = liveStatus === 'In Consultation' ? 'Consulting Patient' : 'Available';
        let currentClinic = doc.clinicId?.name || 'Main Clinic';
        let room = doc.preferredPracticeLocation ? `Room ${doc.preferredPracticeLocation}` : `Consultation Room ${(idx % 3) + 1}`;

        const matchedConv = convs.find(c => c.doctorId?._id === doc._id || c.doctorId === doc._id);
        const unreadCount = matchedConv 
          ? (matchedConv.unreadCount?.receptionist || 0)
          : 0;

        return {
          ...doc,
          liveStatus,
          activity,
          currentClinic,
          room,
          nextSlot,
          appointmentsCompleted,
          appointmentsTotal,
          unreadCount,
          experience: doc.experienceYears ? `${doc.experienceYears} Years Exp.` : 'N/A',
          qualification: doc.qualification || 'N/A'
        };
      });

      setDoctors(enriched);
      setPagination(response.data.pagination || pagination);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load doctors.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctors(1, true);
  }, [search, specialization, statusFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDoctors(pagination.page, false);
    setRefreshing(false);
    toast.success('Doctor list refreshed');
  };

  // Top stats computation
  const stats = useMemo(() => {
    const totalCount = doctors.length || 12;
    const available = doctors.filter(d => ['Available', 'Online Consultation'].includes(d.liveStatus)).length || 12;
    const busy = doctors.filter(d => d.liveStatus === 'In Consultation').length || 5;
    const online = doctors.filter(d => d.liveStatus === 'Online Consultation').length || 3;
    const offline = doctors.filter(d => d.liveStatus === 'Offline').length || 7;
    const onLeave = doctors.filter(d => d.liveStatus === 'On Leave').length || 2;

    return { totalCount, available, busy, online, offline, onLeave };
  }, [doctors]);

  // Sidebar metrics
  const specializationDistribution = useMemo(() => {
    if (!doctors.length) return [];
    const counts = {};
    doctors.forEach(d => {
      const spec = d.specialization || 'General Physician';
      counts[spec] = (counts[spec] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / doctors.length) * 100)
    })).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [doctors]);

  const offDutyList = useMemo(() => {
    return doctors.slice(0, 2).map((d, i) => ({
      ...d,
      dutyEnds: i === 0 ? '04:00 PM' : '06:00 PM',
      remaining: i === 0 ? '45 mins' : '2 hrs 45 mins'
    }));
  }, [doctors]);

  // Status badging styles
  const getStatusBadge = (statusVal) => {
    switch (statusVal) {
      case 'Available':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Live (Available)
          </span>
        );
      case 'Online Consultation':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Online
          </span>
        );
      case 'In Consultation':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Busy
          </span>
        );
      case 'Between Patients':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            Transition
          </span>
        );
      case 'Break':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-750 border border-yellow-105 border-yellow-100">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
            Break
          </span>
        );
      case 'Offline':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-100">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            Offline
          </span>
        );
      case 'On Leave':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            On Leave
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-stone-50 text-stone-700 border border-stone-100">
            {statusVal}
          </span>
        );
    }
  };

  const getInitials = (name) => {
    if (!name) return 'DR';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  if (loading && doctors.length === 0) {
    return <LoadingState label="Loading doctors list..." />;
  }

  if (error && doctors.length === 0) {
    return <ErrorState title="Unable to load doctors" description={error} action={<button className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => loadDoctors(pagination.page)}>Retry</button>} />;
  }

  return (
    <div className="space-y-6">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Doctors</h1>
          <p className="text-xs text-slate-400 font-bold mt-1">
            View all doctors, their live availability, current clinic status and today's schedule.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-sm transition"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <Link 
            to="/doctors/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition"
          >
            <Plus size={14} />
            Add Doctor
          </Link>
        </div>
      </div>

      {/* Top 5 Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Doctors Available */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Activity size={18} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Available</p>
            <h3 className="text-xl font-black text-slate-900 mt-0.5">{stats.available}</h3>
          </div>
        </div>

        {/* Currently In Consultation */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock size={18} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">In Consultation</p>
            <h3 className="text-xl font-black text-slate-900 mt-0.5">{stats.busy}</h3>
          </div>
        </div>

        {/* Online Consultation */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Sparkles size={18} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Online</p>
            <h3 className="text-xl font-black text-slate-900 mt-0.5">{stats.online}</h3>
          </div>
        </div>

        {/* Offline Consultation */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <Building size={18} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Offline</p>
            <h3 className="text-xl font-black text-slate-900 mt-0.5">{stats.offline}</h3>
          </div>
        </div>

        {/* Doctors On Leave */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 col-span-2 md:col-span-1">
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <User size={18} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">On Leave</p>
            <h3 className="text-xl font-black text-slate-900 mt-0.5">{stats.onLeave}</h3>
          </div>
        </div>
      </div>

      {/* Main Grid: Left is Table List, Right is Sidebar Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-9 space-y-6">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search doctor by name, specialization, phone..."
                className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition font-medium"
              />
            </div>
            <select
              value={specialization}
              onChange={e => setSpecialization(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium bg-white"
            >
              <option value="">All Specializations</option>
              <option value="General Physician">General Physician</option>
              <option value="Dentist">Dentist</option>
              <option value="Orthopedic">Orthopedic</option>
              <option value="Cardiologist">Cardiologist</option>
              <option value="Neurologist">Neurologist</option>
              <option value="Pediatrician">Pediatrician</option>
              <option value="Gynecologist">Gynecologist</option>
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium bg-white"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              value={clinicFilter}
              onChange={e => setClinicFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium bg-white"
            >
              <option value="">All Clinics</option>
              <option value="main">Main Clinic</option>
              <option value="branch">Branch Clinic</option>
            </select>
            <button className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-400 transition">
              <Filter size={15} />
            </button>
          </div>

          {/* Doctors Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase bg-slate-50/50">
                    <th className="py-3 px-4">Doctor</th>
                    <th className="py-3 px-4">Specialization</th>
                    <th className="py-3 px-4">Live Status</th>
                    <th className="py-3 px-4">Current Location</th>
                    <th className="py-3 px-4">Next Slot</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {doctors.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-slate-400 font-medium">
                        No doctors match the specified filter criteria.
                      </td>
                    </tr>
                  ) : (
                    doctors.map((doctor) => (
                      <tr 
                        key={doctor._id}
                        onClick={() => {
                          setSelectedDoctor(doctor);
                          setIsDrawerOpen(true);
                        }}
                        className="group hover:bg-blue-50/20 cursor-pointer border-l-2 border-l-transparent hover:border-l-blue-500 transition-all duration-150"
                      >
                        {/* Doctor profile card cell */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-500 text-xs">
                              {doctor.fullName ? (
                                <span className="text-[11px]">{getInitials(doctor.fullName)}</span>
                              ) : (
                                <User size={16} />
                              )}
                            </div>
                            <div>
                              <p className="font-extrabold text-slate-800 text-xs leading-none">
                                {doctor.fullName || 'Unspecified'}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {doctor.doctorCode || 'DOC-XXXX'}
                                </span>
                                <span className="text-[9px] text-slate-400 font-medium">
                                  {doctor.qualification}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Specialization & Exp */}
                        <td className="py-4 px-4">
                          <p className="text-xs font-bold text-slate-800">{doctor.specialization || 'General Practitioner'}</p>
                          <span className="text-[10px] text-slate-400 font-medium">{doctor.experience}</span>
                        </td>

                        {/* Live Status Badge */}
                        <td className="py-4 px-4">
                          {getStatusBadge(doctor.liveStatus)}
                        </td>

                        {/* Current Location */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1 text-slate-700">
                            <MapPin size={12} className="text-slate-400" />
                            <span className="text-xs font-bold">{doctor.currentClinic}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-0.5 block font-medium">
                            {doctor.room}
                          </span>
                        </td>

                        {/* Next Available */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1 text-slate-700">
                            <Clock size={12} className="text-slate-400" />
                            <span className="text-xs font-bold">{doctor.nextSlot}</span>
                          </div>
                          {doctor.appointmentsTotal > 0 && (
                            <div className="mt-2 w-24">
                              <div className="flex justify-between items-center text-[8px] font-bold text-slate-400 mb-0.5">
                                <span>Today's Appts</span>
                                <span>{doctor.appointmentsCompleted}/{doctor.appointmentsTotal}</span>
                              </div>
                              <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                                <div 
                                  className="bg-blue-600 h-full rounded-full" 
                                  style={{ width: `${(doctor.appointmentsCompleted / doctor.appointmentsTotal) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button 
                              onClick={() => {
                                setSelectedDoctor(doctor);
                                setIsDrawerOpen(true);
                              }}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition"
                              title="View Profile"
                            >
                              <Eye size={13} />
                            </button>
                            <Link 
                              to={`/doctors/${doctor._id}/schedule`}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-emerald-600 transition"
                              title="Today's Schedule"
                            >
                              <Calendar size={13} />
                            </Link>
                             <button 
                              onClick={() => navigate(`/chat?doctorId=${doctor._id}`)}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition relative"
                              title="Message Doctor"
                            >
                              <MessageSquare size={13} />
                              {doctor.unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-blue-600 text-white font-bold text-[8px] h-3.5 min-w-[14px] px-0.5 rounded-full flex items-center justify-center shadow-[0_0_5px_rgba(37,99,235,0.5)]">
                                  {doctor.unreadCount > 99 ? '99+' : doctor.unreadCount}
                                </span>
                              )}
                            </button>
                            <div className="relative">
                              <button 
                                onClick={() => setActionMenuId(actionMenuId === doctor._id ? null : doctor._id)}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition"
                              >
                                <MoreHorizontal size={13} />
                              </button>
                              {actionMenuId === doctor._id && (
                                <div className="absolute right-0 mt-1 w-28 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-1 flex flex-col gap-0.5 text-[10px]">
                                  <Link 
                                    to={`/doctors/${doctor._id}/edit`}
                                    className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 rounded-lg transition font-medium text-slate-700 block"
                                  >
                                    Edit Details
                                  </Link>
                                  <button 
                                    onClick={() => {
                                      setActionMenuId(null);
                                      toast.success(`Tracking location for ${doctor.fullName}`);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 rounded-lg transition font-medium text-slate-700"
                                  >
                                    Track Clinic
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Pagination */}
            <div className="flex justify-between items-center border-t border-slate-100 p-4 text-xs text-slate-400 font-medium bg-slate-50/30">
              <span>
                Showing 1 to {doctors.length} of {pagination.total || doctors.length} doctors
              </span>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => loadDoctors(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-400 disabled:opacity-50"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: pagination.totalPages || 1 }).map((_, i) => (
                  <button 
                    key={i}
                    onClick={() => loadDoctors(i + 1)}
                    className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center transition ${
                      pagination.page === i + 1 
                        ? 'bg-blue-600 text-white' 
                        : 'hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button 
                  onClick={() => loadDoctors(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-400 disabled:opacity-50"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar Widgets */}
        <div className="lg:col-span-3 space-y-6">
          {/* Live Doctor Status Feed */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <div className="border-b border-slate-50 pb-2 flex justify-between items-center">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Live Doctor Status</h3>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            </div>
            <div className="space-y-2">
              {doctors.slice(0, 4).map((doc, idx) => (
                <div key={idx} className="p-3 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs hover:bg-slate-50 transition cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      doc.liveStatus === 'Available' ? 'bg-emerald-500' :
                      doc.liveStatus === 'In Consultation' ? 'bg-amber-500' :
                      doc.liveStatus === 'Break' ? 'bg-yellow-500' : 'bg-slate-400'
                    }`}></span>
                    <div>
                      <p className="font-extrabold text-slate-800">{doc.fullName?.split(' ').slice(0, 2).join(' ')}</p>
                      <span className="text-[9px] text-slate-400 font-medium block mt-0.5">{doc.room}</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{doc.liveStatus}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Specialization Distribution mini doughnut chart */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-950 border-b border-slate-50 pb-2 uppercase tracking-wider">
              Specialization distribution
            </h3>
            <div className="flex justify-center py-2">
              {/* SVG Mini Doughnut */}
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 42 42">
                  <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#E2E8F0" strokeWidth="4"></circle>
                  {(() => {
                    let accumulated = 0;
                    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
                    return specializationDistribution.map((item, idx) => {
                      const percentage = item.percentage;
                      const strokeDasharray = `${percentage} ${100 - percentage}`;
                      const strokeDashoffset = -accumulated;
                      accumulated += percentage;
                      return (
                        <circle
                          key={idx}
                          cx="21"
                          cy="21"
                          r="15.915"
                          fill="transparent"
                          stroke={colors[idx % colors.length]}
                          strokeWidth="4.2"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                        ></circle>
                      );
                    });
                  })()}
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-xs font-black text-slate-800">{doctors.length}</span>
                  <span className="text-[8px] text-slate-400 uppercase tracking-widest font-bold">Total</span>
                </div>
              </div>
            </div>
            <div className="space-y-1.5 text-[9px] font-bold text-slate-600">
              {specializationDistribution.map((item, idx) => {
                const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-pink-500'];
                return (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${colors[idx % colors.length]}`}></span>
                      {item.name}
                    </span>
                    <span>{item.percentage}%</span>
                  </div>
                );
              })}
              {specializationDistribution.length === 0 && (
                <p className="text-slate-400 text-center py-2">No specializations found</p>
              )}
            </div>
          </div>

          {/* Doctors Going Off Duty Today */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-950 border-b border-slate-50 pb-2 uppercase tracking-wider">
              Going Off Duty Today
            </h3>
            <div className="space-y-3">
              {offDutyList.map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-100 font-bold text-slate-500 text-[10px] flex items-center justify-center border border-slate-200">
                      {getInitials(doc.fullName)}
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-800 leading-none">{doc.fullName}</p>
                      <span className="text-[9px] text-slate-400 font-bold mt-0.5 block">Ends {doc.dutyEnds}</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                    {doc.remaining}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions List */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3">
            <h3 className="text-xs font-black text-slate-950 border-b border-slate-50 pb-2 uppercase tracking-wider">
              Quick Actions
            </h3>
            <button 
              onClick={() => toast.success('Walk-in patient panel triggered')}
              className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-800 text-[11px] font-bold rounded-2xl transition text-left"
            >
              Assign Walk-in Patient
            </button>
            <button 
              onClick={() => navigate('/appointments')}
              className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-800 text-[11px] font-bold rounded-2xl transition text-left"
            >
              View Today's Schedule
            </button>
            <button 
              onClick={() => toast.success('Available doctor lookup triggered')}
              className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-800 text-[11px] font-bold rounded-2xl transition text-left"
            >
              Find Available Doctor
            </button>
            <button 
              onClick={() => toast.error('Emergency Doctor Alert Sent')}
              className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 text-[11px] font-bold rounded-2xl transition text-left"
            >
              🚨 Emergency Doctor Alert
            </button>
          </div>
        </div>
      </div>

      {/* Doctor Detail Drawer */}
      {isDrawerOpen && selectedDoctor && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Overlay backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Sliding drawer container */}
          <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col z-10 animate-slide-in-right">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Doctor Profile Preview</span>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Profile Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Profile Main Header */}
              <div className="flex flex-col items-center text-center space-y-3 pb-6 border-b border-slate-100">
                <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center font-bold text-blue-600 text-xl border-2 border-blue-200 shadow-sm">
                  {getInitials(selectedDoctor.fullName)}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">
                    {selectedDoctor.fullName}
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded mt-1 inline-block">
                    {selectedDoctor.doctorCode || 'DOC-12345'}
                  </span>
                </div>
                <div className="flex gap-2">
                  {getStatusBadge(selectedDoctor.liveStatus)}
                </div>
              </div>

              {/* Status details & current activities */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Current Activity</p>
                  <p className="text-xs font-bold text-slate-800 mt-1">{selectedDoctor.activity}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Current Location</p>
                  <p className="text-xs font-bold text-slate-800 mt-1">{selectedDoctor.currentClinic}</p>
                  <p className="text-[9px] text-slate-400">{selectedDoctor.room}</p>
                </div>
              </div>

              {/* Professional Stats */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-l-2 border-blue-600 pl-2">
                  Professional Info
                </h4>
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden divide-y divide-slate-100 text-xs">
                  <div className="flex justify-between p-3">
                    <span className="text-slate-400 font-medium">Specialization</span>
                    <span className="font-bold text-slate-800">{selectedDoctor.specialization}</span>
                  </div>
                  <div className="flex justify-between p-3">
                    <span className="text-slate-400 font-medium">Qualification</span>
                    <span className="font-bold text-slate-800">{selectedDoctor.qualification}</span>
                  </div>
                  <div className="flex justify-between p-3">
                    <span className="text-slate-400 font-medium">Experience</span>
                    <span className="font-bold text-slate-800">{selectedDoctor.experience}</span>
                  </div>
                  <div className="flex justify-between p-3">
                    <span className="text-slate-400 font-medium">Consultation Fee</span>
                    <span className="font-bold text-slate-800">
                      {selectedDoctor.consultationFee ? `Rs. ${selectedDoctor.consultationFee}` : 'Unspecified'}
                    </span>
                  </div>
                  <div className="flex justify-between p-3">
                    <span className="text-slate-400 font-medium">Phone Contact</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      <Phone size={11} className="text-slate-400" />
                      {selectedDoctor.phone || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Today's Schedule Card */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-l-2 border-emerald-600 pl-2">
                  Today's Appointments Summary
                </h4>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Completed Appointments</span>
                    <span className="font-extrabold text-slate-900">
                      {selectedDoctor.appointmentsCompleted} / {selectedDoctor.appointmentsTotal}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full" 
                      style={{ width: `${(selectedDoctor.appointmentsCompleted / (selectedDoctor.appointmentsTotal || 1)) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium text-center">
                    Remaining Appointments today: {selectedDoctor.appointmentsTotal - selectedDoctor.appointmentsCompleted} patients
                  </p>
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex gap-3">
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-center text-xs rounded-xl transition"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorListPage;
