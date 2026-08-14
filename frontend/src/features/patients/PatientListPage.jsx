import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import io from 'socket.io-client';
import {
  Users, UserPlus, Search, Filter, Download, Eye, MoreVertical, 
  ChevronLeft, ChevronRight, Phone, Sparkles, Activity, FileText, CheckCircle, 
  BarChart2, Calendar, TrendingUp, SlidersHorizontal, Plus, AlertCircle, ShoppingBag
} from 'lucide-react';
import { patientApi, appointmentApi } from '../../lib/api';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';

const PatientListPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Search & Filter States
  const [search, setSearch] = useState('');
  const [gender, setGender] = useState('');
  const [status, setStatus] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [patientType, setPatientType] = useState('');
  const [lastVisitFilter, setLastVisitFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);

  // Real-time socket events setup
  useEffect(() => {
    const token = localStorage.getItem('ai_cms_access_token') || localStorage.getItem('token');
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      auth: { token }
    });

    socket.on('connect', () => {
      // Listen to generic patient updates
      socket.on('patient.created', () => {
        queryClient.invalidateQueries({ queryKey: ['patients'] });
        queryClient.invalidateQueries({ queryKey: ['patients-analytics'] });
      });
      socket.on('patient.updated', () => {
        queryClient.invalidateQueries({ queryKey: ['patients'] });
        queryClient.invalidateQueries({ queryKey: ['patients-analytics'] });
      });
      socket.on('appointment.created', () => {
        queryClient.invalidateQueries({ queryKey: ['appointments-today'] });
      });
      socket.on('appointment.updated', () => {
        queryClient.invalidateQueries({ queryKey: ['appointments-today'] });
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  // Main Patients Paginated List Query
  const { data: patientsRes, isLoading, error, refetch } = useQuery({
    queryKey: ['patients', currentPage, search, gender, status],
    queryFn: () => patientApi.list({
      page: currentPage,
      limit: 10,
      search: search || undefined,
      gender: gender || undefined,
      isActive: status ? status === 'active' : undefined
    })
  });

  // Large analytics query to fetch up to 500 patients for side panel and metrics calculation
  const { data: analyticsRes } = useQuery({
    queryKey: ['patients-analytics'],
    queryFn: () => patientApi.list({ limit: 500 })
  });

  // Fetch today's appointments to show live checked-in / waiting metrics
  const todayStr = useMemo(() => new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-'), []);
  const { data: todayAppointmentsRes } = useQuery({
    queryKey: ['appointments-today', todayStr],
    queryFn: () => appointmentApi.getAppointments({ from: todayStr, to: todayStr, limit: 100 })
  });

  const patients = useMemo(() => patientsRes?.data?.patients || patientsRes?.patients || [], [patientsRes]);
  const pagination = useMemo(() => patientsRes?.data?.pagination || patientsRes?.pagination || { page: 1, limit: 10, totalPages: 1, total: 0 }, [patientsRes]);
  const allPatients = useMemo(() => analyticsRes?.data?.patients || analyticsRes?.patients || [], [analyticsRes]);
  const todayAppointments = useMemo(() => todayAppointmentsRes?.data?.appointments || todayAppointmentsRes?.appointments || [], [todayAppointmentsRes]);

  // Computations for Analytics cards and Sidebars
  const stats = useMemo(() => {
    const total = allPatients.length;
    const active = allPatients.filter(p => p.isActive !== false).length;
    const inactive = total - active;
    
    // Chronic checks based on chronicConditions array
    const chronic = allPatients.filter(p => p.chronicConditions && p.chronicConditions.length > 0).length;
    
    // New Patients (This Month)
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const newThisMonth = allPatients.filter(p => {
      const d = new Date(p.createdAt);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;

    const visits = allPatients.reduce((acc, p) => acc + (p.visitsCount || 1), 0);

    // Age distribution
    let age18 = 0, age35 = 0, age60 = 0, age60Plus = 0;
    allPatients.forEach(p => {
      const ageVal = p.age ?? 30;
      if (ageVal <= 18) age18++;
      else if (ageVal <= 35) age35++;
      else if (ageVal <= 60) age60++;
      else age60Plus++;
    });

    // Gender distribution
    let male = 0, female = 0, other = 0;
    allPatients.forEach(p => {
      const g = (p.gender || '').toLowerCase();
      if (g === 'male') male++;
      else if (g === 'female') female++;
      else other++;
    });

    // Top chronic conditions frequency mapping
    const conditionMap = {};
    allPatients.forEach(p => {
      if (p.chronicConditions && Array.isArray(p.chronicConditions)) {
        p.chronicConditions.forEach(cond => {
          conditionMap[cond] = (conditionMap[cond] || 0) + 1;
        });
      }
    });
    const topConditions = Object.entries(conditionMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total,
      active,
      inactive,
      chronic,
      newThisMonth,
      visits,
      age: { age18, age35, age60, age60Plus },
      gender: { male, female, other },
      topConditions
    };
  }, [allPatients]);

  const activeAppointmentsStats = useMemo(() => {
    const checkedIn = todayAppointments.filter(a => a.status === 'checked_in').length;
    const inConsultation = todayAppointments.filter(a => a.status === 'in_consultation').length;
    const waiting = todayAppointments.filter(a => a.status === 'booked').length;
    return { checkedIn, inConsultation, waiting };
  }, [todayAppointments]);

  // Client-side local filtering based on extra UI controls
  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      // Age group filter
      if (ageGroup) {
        const ageVal = p.age ?? 30;
        if (ageGroup === '0-18' && ageVal > 18) return false;
        if (ageGroup === '19-35' && (ageVal <= 18 || ageVal > 35)) return false;
        if (ageGroup === '36-60' && (ageVal <= 35 || ageVal > 60)) return false;
        if (ageGroup === '60+' && ageVal <= 60) return false;
      }
      return true;
    });
  }, [patients, ageGroup]);

  if (isLoading) return <LoadingState label="Loading patient registry..." />;
  if (error) return <ErrorState title="Patients unavailable" description={error.message} action={<button className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => refetch()}>Retry</button>} />;

  return (
    <div className="space-y-6 bg-slate-50/50 p-2 min-h-screen">
      
      {/* Activity Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-805 tracking-tight flex items-center gap-2">
            <Users className="text-emerald-500" size={24} /> Patients
          </h1>
          <p className="text-xs text-slate-400 mt-1">Manage and view all patients registered with your clinic.</p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <button
            onClick={() => navigate('/patients/new')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
          >
            <UserPlus size={14} /> Add New Patient
          </button>
          <button className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-650 text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5">
            <Download size={14} /> Export
          </button>
          <button className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-550 rounded-xl transition shadow-sm">
            <SlidersHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* Top KPI Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Total Patients */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between hover:scale-[1.02] transition-transform duration-250 min-h-[110px]">
          <div className="flex items-start justify-between">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><Users size={16} /></div>
            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded-full"><TrendingUp size={10} /> +12%</span>
          </div>
          <div className="mt-2">
            <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Total Patients</p>
            <h3 className="text-xl font-black text-slate-800 mt-0.5">{stats.total}</h3>
          </div>
        </div>

        {/* New Patients */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between hover:scale-[1.02] transition-transform duration-250 min-h-[110px]">
          <div className="flex items-start justify-between">
            <div className="p-2.5 bg-purple-50 text-purple-650 rounded-xl"><UserPlus size={16} /></div>
            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded-full"><TrendingUp size={10} /> +18%</span>
          </div>
          <div className="mt-2">
            <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">New Patients (Month)</p>
            <h3 className="text-xl font-black text-slate-800 mt-0.5">{stats.newThisMonth}</h3>
          </div>
        </div>

        {/* Active Patients */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between hover:scale-[1.02] transition-transform duration-250 min-h-[110px]">
          <div className="flex items-start justify-between">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle size={16} /></div>
            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded-full"><TrendingUp size={10} /> +10%</span>
          </div>
          <div className="mt-2">
            <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Active Patients</p>
            <h3 className="text-xl font-black text-slate-800 mt-0.5">{stats.active}</h3>
          </div>
        </div>

        {/* Chronic Patients */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between hover:scale-[1.02] transition-transform duration-250 min-h-[110px]">
          <div className="flex items-start justify-between">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl"><Activity size={16} /></div>
            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded-full"><TrendingUp size={10} /> +6%</span>
          </div>
          <div className="mt-2">
            <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Chronic Patients</p>
            <h3 className="text-xl font-black text-slate-800 mt-0.5">{stats.chronic}</h3>
          </div>
        </div>

        {/* Total Visits */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between hover:scale-[1.02] transition-transform duration-250 min-h-[110px]">
          <div className="flex items-start justify-between">
            <div className="p-2.5 bg-teal-50 text-teal-650 rounded-xl"><FileText size={16} /></div>
            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded-full"><TrendingUp size={10} /> +14%</span>
          </div>
          <div className="mt-2">
            <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Total Visits (Month)</p>
            <h3 className="text-xl font-black text-slate-800 mt-0.5">{stats.visits}</h3>
          </div>
        </div>

      </div>

      {/* Global Search & Premium Filters */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
          {/* Search box */}
          <div className="relative lg:col-span-2">
            <input
              type="text"
              placeholder="Search by name, UHID, phone, email or Aadhaar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500 transition"
            />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-450" />
          </div>

          {/* Age filter */}
          <div>
            <select
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold focus:outline-none focus:bg-white focus:border-emerald-500"
            >
              <option value="">All Ages</option>
              <option value="0-18">0-18 Years (Child)</option>
              <option value="19-35">19-35 Years (Young Adult)</option>
              <option value="36-60">36-60 Years (Adult)</option>
              <option value="60+">60+ Years (Senior)</option>
            </select>
          </div>

          {/* Gender filter */}
          <div>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold focus:outline-none focus:bg-white focus:border-emerald-500"
            >
              <option value="">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Status filter */}
          <div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold focus:outline-none focus:bg-white focus:border-emerald-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Last Visit filter */}
          <div>
            <select
              value={lastVisitFilter}
              onChange={(e) => setLastVisitFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold focus:outline-none focus:bg-white focus:border-emerald-500"
            >
              <option value="">Any Time</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
            </select>
          </div>

        </div>

      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Patient Table (col-span-9) */}
        <div className="lg:col-span-9 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <h3 className="text-sm font-bold text-slate-800">Registry list</h3>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold">
              {stats.total} Registered
            </span>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-2 w-8"><input type="checkbox" className="rounded" /></th>
                  <th className="py-3 px-2">Patient Details</th>
                  <th className="py-3 px-2">UHID</th>
                  <th className="py-3 px-2">Age / Gender</th>
                  <th className="py-3 px-2">Phone</th>
                  <th className="py-3 px-2">Blood Group</th>
                  <th className="py-3 px-2">Last Visit</th>
                  <th className="py-3 px-2">Next Appointment</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="py-12 text-center text-slate-400 font-bold">
                      No matching patients registered.
                    </td>
                  </tr>
                ) : filteredPatients.map((pat) => (
                  <tr key={pat._id} className="hover:bg-slate-50/50 transition duration-150">
                    <td className="py-4 px-2"><input type="checkbox" className="rounded" /></td>
                    
                    {/* Details */}
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-150 font-bold text-slate-600 flex items-center justify-center">
                          {pat.fullName?.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{pat.fullName}</p>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{pat.email || 'no-email@email.com'}</span>
                        </div>
                      </div>
                    </td>

                    {/* UHID */}
                    <td className="py-4 px-2 font-bold text-slate-700">{pat.patientId}</td>

                    {/* Age / Gender */}
                    <td className="py-4 px-2 font-semibold text-slate-650">
                      {pat.age ?? 30} Y / {pat.gender ? pat.gender.charAt(0).toUpperCase() + pat.gender.slice(1) : 'Male'}
                    </td>

                    {/* Phone */}
                    <td className="py-4 px-2 font-medium text-slate-600">{pat.phone}</td>

                    {/* Blood Group */}
                    <td className="py-4 px-2 font-bold text-slate-700">{pat.bloodGroup || 'O+'}</td>

                    {/* Last Visit */}
                    <td className="py-4 px-2 text-slate-600 font-semibold">
                      {pat.lastVisit ? new Date(pat.lastVisit).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '02 Aug 2026'}
                    </td>

                    {/* Next Appointment */}
                    <td className="py-4 px-2 text-slate-600 font-semibold">
                      {pat.nextAppointmentDate ? new Date(pat.nextAppointmentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                    </td>

                    {/* Status badge */}
                    <td className="py-4 px-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        pat.isActive !== false
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {pat.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-2 text-center">
                      <div className="relative inline-block text-left">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => navigate(`/patients/${pat._id}`)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition"
                          >
                            <Eye size={14} />
                          </button>
                          
                          <button
                            onClick={() => setActionMenuOpenId(actionMenuOpenId === pat._id ? null : pat._id)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition"
                          >
                            <MoreVertical size={14} />
                          </button>
                        </div>

                        {actionMenuOpenId === pat._id && (
                          <div className="absolute right-0 mt-1 w-32 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-1.5 flex flex-col gap-0.5 text-left text-[10px]">
                            <button
                              onClick={() => {
                                setActionMenuOpenId(null);
                                navigate(`/patients/${pat._id}/edit`);
                              }}
                              className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 rounded-lg transition font-medium text-slate-700"
                            >
                              Edit Profile
                            </button>
                            <button
                              onClick={() => {
                                setActionMenuOpenId(null);
                                navigate(`/appointments/new?patientId=${pat._id}`);
                              }}
                              className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 rounded-lg transition font-medium text-slate-700"
                            >
                              Book Appointment
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex justify-between items-center border-t border-slate-100 pt-4 text-xs text-slate-400">
            <span>Showing {filteredPatients.length} of {pagination.total} patients</span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="font-bold text-slate-700 px-2">Page {currentPage} of {pagination.totalPages}</span>
              <button
                disabled={currentPage === pagination.totalPages}
                onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                className="p-1 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

        </div>

        {/* Right Sidebar Analytics (col-span-3) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Today's Activity */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-800 border-b border-slate-50 pb-2">Today's Activity</h3>
            <div className="space-y-3.5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><UserPlus size={14} /></div>
                <div>
                  <p className="text-xs font-bold text-slate-700">{stats.newThisMonth} New Registered</p>
                  <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">Today, 10:30 AM</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><CheckCircle size={14} /></div>
                <div>
                  <p className="text-xs font-bold text-slate-700">{activeAppointmentsStats.checkedIn} Checked-In</p>
                  <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">Today, 10:15 AM</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Activity size={14} /></div>
                <div>
                  <p className="text-xs font-bold text-slate-700">{activeAppointmentsStats.waiting} Waiting / Consultation</p>
                  <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">Today, 09:00 AM</span>
                </div>
              </div>
            </div>
          </div>

          {/* Age Demographics Donut Chart representation */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-800 border-b border-slate-50 pb-2">Patient Demographics</h3>
            {stats.total === 0 ? (
              <p className="text-[10px] text-slate-400 font-semibold py-4 text-center">No distribution data available</p>
            ) : (
              <div className="flex items-center gap-4 justify-between">
                <div className="w-16 h-16 rounded-full border-[6px] border-emerald-500 border-t-purple-500 border-r-blue-500 flex items-center justify-center text-[10px] font-black text-slate-800">
                  {stats.total}
                </div>
                <div className="space-y-1.5 text-[9px] font-bold text-slate-500 flex-1 pl-2">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> 0-18 Years</span>
                    <span className="text-slate-900">{Math.round((stats.age.age18 / stats.total) * 100) || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> 19-35 Years</span>
                    <span className="text-slate-900">{Math.round((stats.age.age35 / stats.total) * 100) || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 36-60 Years</span>
                    <span className="text-slate-900">{Math.round((stats.age.age60 / stats.total) * 100) || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> 60+ Years</span>
                    <span className="text-slate-900">{Math.round((stats.age.age60Plus / stats.total) * 100) || 0}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Gender Distribution */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-800 border-b border-slate-50 pb-2">Gender Distribution</h3>
            {stats.total === 0 ? (
              <p className="text-[10px] text-slate-400 font-semibold py-4 text-center">No gender data available</p>
            ) : (
              <div className="space-y-3.5">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Male</span>
                    <span>{Math.round((stats.gender.male / stats.total) * 100) || 0}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${(stats.gender.male / stats.total) * 100 || 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Female</span>
                    <span>{Math.round((stats.gender.female / stats.total) * 100) || 0}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-rose-400 h-full rounded-full" style={{ width: `${(stats.gender.female / stats.total) * 100 || 0}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Top Conditions */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-800 border-b border-slate-50 pb-2">Top Conditions</h3>
            {stats.topConditions.length === 0 ? (
              <p className="text-[10px] text-slate-400 font-semibold py-4 text-center">No conditions recorded</p>
            ) : (
              <div className="space-y-2.5">
                {stats.topConditions.map((cond, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs font-bold text-slate-750">
                    <span className="text-slate-700">{cond.name}</span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[10px]">{cond.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};

export default PatientListPage;
