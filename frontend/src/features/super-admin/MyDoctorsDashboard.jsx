import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import {
  Settings, Calendar, Search, Filter, Plus, Eye, Edit3, Trash,
  MoreVertical, Check, Star, Users, Briefcase, DollarSign,
  TrendingUp, Award, Clock, ArrowRight, ShieldAlert, GraduationCap,
  ChevronLeft, ChevronRight, CalendarIcon, Ban, CalendarDays, CheckCircle, Building, CheckSquare, AlertTriangle, X, Trash2,
  User, FileText, CheckCircle2, ShieldCheck, Landmark, Sparkles, MapPin, Phone, Mail, FileCheck, ArrowUpRight, History, MessageSquare, Edit, Activity, DownloadCloud, Lock, Unlock
} from 'lucide-react';
import { adminApi, clinicApi, specializationApi, userApi, leaveApi, doctorApi, appointmentApi, patientApi } from '../../lib/api';
import useAuth from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const MyDoctorsDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [flowData, setFlowData] = useState(null);
  
  // Add Doctor Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [doctorsToAdd, setDoctorsToAdd] = useState([{ fullName: '', email: '', phone: '' }]);
  const [adding, setAdding] = useState(false);

  // Dashboard state
  const [doctors, setDoctors] = useState([]);
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [leaves, setLeaves] = useState([]);

  // Search/Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [specialtyQuery, setSpecialtyQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);

  const selectedDoctor = useMemo(() => doctors.find(d => d._id === selectedDoctorId), [doctors, selectedDoctorId]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [dashRes, specsRes, leavesRes, onboardingRes] = await Promise.all([
        adminApi.getMyDoctorsDashboard(),
        specializationApi.list(),
        leaveApi.list().catch(() => ({ leaves: [] })),
        user?.clinicId ? clinicApi.getOnboardingFlow(user.clinicId) : Promise.resolve({ data: null })
      ]);
      setFlowData(onboardingRes?.data);
      
      const allApiDoctors = dashRes.data?.doctors || [];
      const approved = allApiDoctors.filter(d => d.approvalStatus === 'approved' || d.approvalStatus === undefined || d.isActive);
      const pending = dashRes.data?.pendingDoctors || allApiDoctors.filter(d => d.approvalStatus === 'pending');
      
      setDoctors(approved);
      setPendingDoctors(pending);
      setSpecializations(specsRes.data?.specializations || []);
      setLeaves(leavesRes.leaves || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load Doctors registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddDoctorsSubmit = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      const activeDocs = doctorsToAdd.filter(doc => doc.fullName?.trim() && doc.email?.trim() && doc.phone?.trim());
      if (activeDocs.length === 0) {
        toast.error('Please enter details for at least one doctor.');
        setAdding(false);
        return;
      }
      
      if (currentDoctorsCount + activeDocs.length > maxDoctors) {
        toast.error(`Plan limit exceeded. You can only add up to ${maxDoctors} doctors.`);
        setAdding(false);
        return;
      }

      for (const doc of activeDocs) {
        await doctorApi.create({
          fullName: doc.fullName.trim(),
          email: doc.email.trim(),
          phone: doc.phone.trim()
        });
      }

      toast.success('Doctor(s) added successfully!');
      setShowAddModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error adding doctor(s).');
    } finally {
      setAdding(false);
    }
  };

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

  // Filter doctors list dynamically based on user selections
  const filteredDoctors = useMemo(() => {
    return doctors.filter(doc => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const docName = (doc.fullName || doc.name || '').toLowerCase();
        const docEmail = (doc.email || '').toLowerCase();
        const docCode = (doc.doctorCode || '').toLowerCase();
        if (!docName.includes(query) && !docEmail.includes(query) && !docCode.includes(query)) {
          return false;
        }
      }

      if (specialtyQuery && doc.specialization?._id !== specialtyQuery && doc.specialization !== specialtyQuery) {
        return false;
      }

      if (statusFilter) {
        const isActive = doc.isActive;
        if (statusFilter === 'active' && !isActive) return false;
        if (statusFilter === 'inactive' && isActive) return false;
      }

      if (availabilityFilter === 'on_leave' && !isDoctorOnLeave(doc._id)) {
        return false;
      }

      return true;
    });
  }, [doctors, searchQuery, specialtyQuery, statusFilter, availabilityFilter, leaves]);

  const maxDoctors = flowData?.limits?.maxDoctors ?? 5;
  const currentDoctorsCount = doctors.length;
  const activeDoctorsCount = doctors.filter(d => d.isActive).length;
  const onLeaveCount = doctors.filter(d => isDoctorOnLeave(d._id)).length;
  const activeDepartmentsCount = new Set(doctors.map(d => d.specialization?.name).filter(Boolean)).size;

  const displayList = filteredDoctors;

  return (
    <div className="space-y-6 bg-slate-50/50 p-1 min-h-screen">
      
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Doctors</h1>
          <p className="text-xs text-slate-400 mt-1">Manage all doctors in your clinic.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
          <button className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-blue-650 text-blue-600 text-xs font-bold rounded-2xl transition shadow-sm">
            Import Doctors
          </button>
          
          {/* Plan limit lock check */}
          {currentDoctorsCount >= maxDoctors ? (
            <button
              onClick={() => navigate('/admin/subscription')}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-md"
            >
              👑 Upgrade Plan
            </button>
          ) : (
            <button
              onClick={() => { setDoctorsToAdd([{ fullName: '', email: '', phone: '' }]); setShowAddModal(true); }}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-md"
            >
              <Plus size={16} /> Add New Doctor
            </button>
          )}
        </div>
      </div>

      {/* 2. KPI Metrics row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[130px]">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 bg-purple-50 text-purple-650 rounded-xl flex items-center justify-center">
              <Users size={16} />
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">
              {Math.round((currentDoctorsCount / maxDoctors) * 100)}% of {maxDoctors} allowed
            </span>
          </div>
          <div className="mt-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Doctors</p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{currentDoctorsCount}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[130px]">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 bg-blue-50 text-blue-650 rounded-xl flex items-center justify-center">
              <CheckCircle size={16} />
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              100% of total
            </span>
          </div>
          <div className="mt-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Doctors</p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{activeDoctorsCount}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[130px]">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 bg-amber-50 text-amber-650 rounded-xl flex items-center justify-center">
              <CalendarDays size={16} />
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">
              0% of total
            </span>
          </div>
          <div className="mt-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">On Leave</p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{onLeaveCount}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[130px]">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 bg-purple-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <Building size={16} />
            </div>
            <span className="text-[10px] font-bold text-slate-400">Active departments</span>
          </div>
          <div className="mt-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Departments</p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{activeDepartmentsCount}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[130px] relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 bg-teal-50 text-teal-650 rounded-xl flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Consultations (Month)</p>
            <h3 className="text-2xl font-black text-slate-955 mt-1">0</h3>
          </div>
        </div>

      </div>

      {/* 3. Filters Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        
        <div className="flex flex-col gap-1 lg:col-span-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Search Doctors</span>
          <div className="relative">
            <input
              type="text"
              placeholder="Search doctors by name, speciality, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-805 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition"
            />
            <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Speciality</span>
          <select
            value={specialtyQuery}
            onChange={(e) => setSpecialtyQuery(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none bg-white"
          >
            <option value="">All Specialities</option>
            {specializations.map(s => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Department</span>
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none bg-white"
          >
            <option value="">All Departments</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none bg-white"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Availability</span>
          <select
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none bg-white"
          >
            <option value="">All</option>
            <option value="available">Available</option>
            <option value="on_leave">On Leave</option>
          </select>
        </div>

      </div>

      {/* Pending Doctors Review Section */}
      {pendingDoctors && pendingDoctors.length > 0 && (
        <div className="bg-amber-50/40 border border-amber-100 p-6 rounded-3xl space-y-4">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle size={18} />
            <h2 className="text-sm font-black uppercase tracking-wider">Pending Doctor Approvals ({pendingDoctors.length})</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingDoctors.map((pDoc) => (
              <div key={pDoc._id} className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between gap-3">
                <div>
                  <p className="font-extrabold text-slate-900 text-sm">{pDoc.fullName || pDoc.name}</p>
                  <p className="text-[10px] text-slate-450 mt-0.5">{pDoc.email}</p>
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                    pDoc.approvalStatus === 'pending_approval'
                      ? 'bg-amber-50 text-amber-600'
                      : pDoc.approvalStatus === 're_edit'
                      ? 'bg-purple-50 text-purple-650'
                      : 'bg-red-50 text-red-600 border border-red-100'
                  }`}>
                    {pDoc.approvalStatus === 'pending_approval'
                      ? 'Awaiting Profile Review'
                      : pDoc.approvalStatus === 're_edit'
                      ? 'Re-Edit Requested'
                      : 'Profile Not Completed'}
                  </span>
                </div>
                <button
                  onClick={() => navigate(`/admin/doctors/${pDoc._id}/review`)}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  Review Profile <ArrowRight size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Doctors List Table */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-2">Doctor</th>
                <th className="py-3 px-2">Speciality & Department</th>
                <th className="py-3 px-2">Experience</th>
                <th className="py-3 px-2">Availability</th>
                <th className="py-3 px-2">Consultation Fee</th>
                <th className="py-3 px-2">Status</th>
                <th className="py-3 px-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs">
              {displayList.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400 font-bold">
                    No doctors registered yet.
                  </td>
                </tr>
              ) : displayList.map((doc) => {
                const onLeave = isDoctorOnLeave(doc._id);
                return (
                  <tr key={doc._id} onClick={() => setSelectedDoctorId(doc._id)} className="hover:bg-slate-50/50 transition cursor-pointer">
                    
                    {/* Doctor Details */}
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-3 group">
                        <div className="w-9 h-9 rounded-full bg-slate-100 font-bold flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition">
                          {doc.fullName?.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-extrabold text-slate-905 group-hover:text-blue-600 group-hover:underline transition">{doc.fullName}</p>
                            {doc.isPrimary && <span className="bg-blue-50 text-blue-600 text-[8px] font-black px-1.5 py-0.5 rounded">Primary</span>}
                          </div>
                          <p className="text-[9px] text-slate-400 mt-0.5">{doc.email}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5 font-semibold">{doc.doctorCode || 'DR12345'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Speciality & Department */}
                    <td className="py-4 px-2">
                      <p className="font-bold text-slate-800">{doc.specialization?.name || 'General Physician'}</p>
                      <span className="text-[9px] text-slate-400 block mt-0.5">General Medicine</span>
                    </td>

                    {/* Experience */}
                    <td className="py-4 px-2 font-medium text-slate-700">{doc.experienceYears || 10}+ Years</td>

                    {/* Availability */}
                    <td className="py-4 px-2">
                      <p className="font-medium text-slate-700">
                        {typeof doc.availability === 'string'
                          ? doc.availability
                          : Array.isArray(doc.availability)
                            ? doc.availability
                                .filter((s) => s.isAvailable)
                                .map((s) => s.dayOfWeek.charAt(0).toUpperCase() + s.dayOfWeek.slice(1, 3))
                                .join(', ') || 'No availability'
                            : 'Mon - Sat (10:00 AM - 06:00 PM)'}
                      </p>
                      <span className="text-[9px] text-emerald-600 flex items-center gap-1 mt-1 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Available
                      </span>
                    </td>

                    {/* Consultation Fee */}
                    <td className="py-4 px-2">
                      <p className="font-extrabold text-slate-900">₹{doc.consultationFee || 500}</p>
                      <span className="text-[9px] text-slate-400 block mt-0.5">Follow up: ₹300</span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        doc.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {doc.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedDoctorId(doc._id); }}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-750 transition"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/doctors/${doc._id}/edit`); }}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-750 transition"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-750 transition" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical size={13} />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Bottom Row Graphs & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Department Wise Doctors Pie Chart */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-xs font-black text-slate-950 border-b border-slate-50 pb-2">Department Wise Doctors</h3>
          {doctors.length === 0 ? (
            <p className="text-[10px] text-slate-400 font-bold py-8 text-center">No department data available</p>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="w-20 h-20 rounded-full border-[8px] border-blue-500 border-t-purple-500 border-r-teal-500 flex items-center justify-center text-[10px] font-black text-slate-800">
                Total {doctors.length}
              </div>
              <div className="space-y-1.5 text-[9px] font-bold text-slate-500 flex-1 pl-2">
                {Object.entries(
                  doctors.reduce((acc, d) => {
                    const name = d.specialization?.name || 'General Medicine';
                    acc[name] = (acc[name] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([name, count]) => (
                  <div key={name} className="flex justify-between items-center">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> {name}
                    </span>
                    <span className="text-slate-900">{count} ({Math.round((count / doctors.length) * 100)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Doctor Performance */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-xs font-black text-slate-955 border-b border-slate-50 pb-2">Doctor Performance (This Month)</h3>
          {doctors.length === 0 ? (
            <p className="text-[10px] text-slate-400 font-bold py-8 text-center">No performance data available</p>
          ) : (
            <div className="space-y-3.5">
              {doctors.slice(0, 3).map((doc, idx) => (
                <div key={idx} className="space-y-1 text-xs">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-slate-805">{doc.fullName}</span>
                    <span className="text-slate-500 flex items-center gap-0.5"><Star size={11} className="fill-amber-400 text-amber-400" /> 5.0</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-650 bg-blue-600 rounded-full" style={{ width: '0%' }} />
                    </div>
                    <span className="text-[9px] font-bold text-slate-450 shrink-0">0 Consultations</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Leaves */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[180px]">
          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
            <h3 className="text-xs font-black text-slate-950">Upcoming Leaves</h3>
            <span className="text-[10px] text-blue-600 font-bold cursor-pointer hover:underline">View All</span>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center py-4 text-center">
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 mb-2">
              <CalendarIcon size={16} />
            </div>
            <p className="text-xs font-black text-slate-800">No upcoming leaves</p>
            <p className="text-[10px] text-slate-400 mt-1">All doctors are available in the upcoming days.</p>
          </div>
        </div>

      </div>

      {/* Onboarding-style Add Doctor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl border border-slate-100 shadow-2xl p-6 md:p-8 space-y-6 animate-fadeIn max-h-[90vh] flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Doctor Setup</h3>
                  <p className="text-xs text-slate-400 mt-1">Add medical practitioners up to your plan limit ({maxDoctors} maximum).</p>
                </div>
                <div className="flex items-center gap-2">
                  {currentDoctorsCount + doctorsToAdd.length < maxDoctors && (
                    <button
                      type="button"
                      onClick={() => setDoctorsToAdd([...doctorsToAdd, { fullName: '', email: '', phone: '' }])}
                      className="px-3.5 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition flex items-center gap-1"
                    >
                      <Plus size={14} /> Add Doctor
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <form onSubmit={handleAddDoctorsSubmit} className="space-y-4 overflow-y-auto pr-2 max-h-[50vh]">
                {doctorsToAdd.map((doc, idx) => (
                  <div key={idx} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl relative space-y-4">
                    {doctorsToAdd.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setDoctorsToAdd(doctorsToAdd.filter((_, i) => i !== idx))}
                        className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">Doctor #{idx + 1}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Doctor Name *</label>
                        <input
                          type="text"
                          value={doc.fullName}
                          onChange={(e) => {
                            const u = [...doctorsToAdd];
                            u[idx].fullName = e.target.value;
                            setDoctorsToAdd(u);
                          }}
                          placeholder="e.g. Dr. Rahul Sharma"
                          className="w-full px-3.5 py-2 bg-white border border-slate-250 rounded-xl outline-none focus:border-blue-600 text-xs text-gray-800"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Address *</label>
                        <input
                          type="email"
                          value={doc.email}
                          onChange={(e) => {
                            const u = [...doctorsToAdd];
                            u[idx].email = e.target.value;
                            setDoctorsToAdd(u);
                          }}
                          placeholder="doctor@domain.com"
                          className="w-full px-3.5 py-2 bg-white border border-slate-250 rounded-xl outline-none focus:border-blue-600 text-xs text-gray-800"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Mobile Number *</label>
                        <input
                          type="tel"
                          value={doc.phone}
                          onChange={(e) => {
                            const u = [...doctorsToAdd];
                            u[idx].phone = e.target.value;
                            setDoctorsToAdd(u);
                          }}
                          placeholder="e.g. 9876543210"
                          className="w-full px-3.5 py-2 bg-white border border-slate-250 rounded-xl outline-none focus:border-blue-600 text-xs text-gray-800"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex justify-end gap-3 border-t border-slate-100 pt-5 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-700 font-bold text-xs transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adding}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-100 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {adding ? 'Adding...' : 'Add Doctors'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {selectedDoctor && (
        <DoctorProfileOverviewOverlay
          doctor={selectedDoctor}
          onClose={() => setSelectedDoctorId(null)}
          onEdit={() => {
            setSelectedDoctorId(null);
            navigate(`/doctors/${selectedDoctor._id}/edit`);
          }}
          onToggleActive={async () => {
            try {
              const newStatus = !selectedDoctor.isActive;
              await doctorApi.update(selectedDoctor._id, { isActive: newStatus });
              toast.success(`Doctor status updated to ${newStatus ? 'Active' : 'Inactive'}`);
              loadData();
              setSelectedDoctorId(null);
            } catch (err) {
              toast.error(err.response?.data?.message || 'Failed to update status');
            }
          }}
        />
      )}

    </div>
  );
};

// --- PREMIUM DOCTOR PROFILE OVERVIEW DRAWER/OVERLAY ---
const DoctorProfileOverviewOverlay = ({ doctor, onClose, onEdit, onToggleActive }) => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [noteText, setNoteText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editText, setEditText] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Local admin notes with persistence
  const [adminNotes, setAdminNotes] = useState(() => {
    try {
      const saved = localStorage.getItem(`admin_notes_${doctor._id}`);
      return saved ? JSON.parse(saved) : [
        { id: '1', content: 'Performance observations: Excellent patient feedback on punctuality and clarity.', date: '2026-07-01' },
        { id: '2', content: 'Internal comments: Completed advanced cardiology training module.', date: '2026-07-04' }
      ];
    } catch {
      return [];
    }
  });

  // Fetch live subdata for appointments and patients
  useEffect(() => {
    const fetchSubData = async () => {
      if (!doctor?._id) return;
      try {
        setLoadingDetails(true);
        const res = await appointmentApi.getAppointments({ doctorId: doctor._id });
        setAppointments(res?.data?.appointments || res?.appointments || []);
      } catch (err) {
        console.error('Error loading doctor detail sub-records:', err);
      } finally {
        setLoadingDetails(false);
      }
    };
    fetchSubData();
  }, [doctor?._id]);

  const saveNotes = (newNotes) => {
    setAdminNotes(newNotes);
    try {
      localStorage.setItem(`admin_notes_${doctor._id}`, JSON.stringify(newNotes));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    const newNote = {
      id: Date.now().toString(),
      content: noteText.trim(),
      date: new Date().toISOString().split('T')[0]
    };
    saveNotes([newNote, ...adminNotes]);
    setNoteText('');
    toast.success('Note added successfully!');
  };

  const handleStartEditNote = (note) => {
    setEditingNoteId(note.id);
    setEditText(note.content);
  };

  const handleSaveEditNote = (id) => {
    if (!editText.trim()) return;
    saveNotes(adminNotes.map(n => n.id === id ? { ...n, content: editText.trim() } : n));
    setEditingNoteId(null);
    toast.success('Note updated successfully!');
  };

  const handleDeleteNote = (id) => {
    saveNotes(adminNotes.filter(n => n.id !== id));
    toast.success('Note deleted!');
  };

  // Safe mapping of doctor fields to avoid dummy data
  const email = doctor.email || 'N/A';
  const phone = doctor.phone || 'N/A';
  const gender = doctor.gender || 'N/A';
  const dob = doctor.dob ? new Date(doctor.dob).toISOString().split('T')[0] : 'N/A';
  const bloodGroup = doctor.bloodGroup || 'N/A';
  const regNumber = doctor.medicalRegistrationNumber || doctor.doctorCode || 'N/A';
  const medicalCouncil = doctor.medicalCouncil || 'State Medical Council';
  const qualification = doctor.qualification || 'MBBS, MD';
  const languages = doctor.languagesSpoken?.join(', ') || 'English, Hindi';
  const biography = doctor.biography || 'No biography details provided.';
  
  const currentAddr = doctor.currentAddress;
  const address = currentAddr
    ? [currentAddr.line1, currentAddr.line2, currentAddr.city, currentAddr.state, currentAddr.pincode].filter(Boolean).join(', ')
    : 'No address loaded';

  const emergencyContact = doctor.emergencyContact || 'Not Specified';

  // Compute stats
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppointments = useMemo(() => {
    return appointments.filter(a => a.date?.startsWith(todayStr));
  }, [appointments, todayStr]);

  const completedAppointments = useMemo(() => {
    return appointments.filter(a => a.status === 'completed' || a.status === 'checked_in');
  }, [appointments]);

  const uniquePatients = useMemo(() => {
    const map = {};
    appointments.forEach(a => {
      const p = a.patientId;
      if (p?._id && !map[p._id]) {
        map[p._id] = {
          id: p._id,
          fullName: p.fullName || 'Unknown Patient',
          phone: p.phone || 'N/A',
          gender: p.gender || 'N/A',
          lastAppointmentDate: a.date,
          status: a.status
        };
      }
    });
    return Object.values(map);
  }, [appointments]);

  const totalRevenue = useMemo(() => {
    return completedAppointments.reduce((sum, a) => sum + (a.paymentDetails?.amountPaid || a.fee || doctor.consultationFee || 0), 0);
  }, [completedAppointments, doctor.consultationFee]);

  // Format Currency Helper
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Get current today's availability details
  const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const todayAvailability = useMemo(() => {
    return doctor.availability?.find(a => a.dayOfWeek?.toLowerCase() === todayDayName);
  }, [doctor.availability, todayDayName]);

  // Chronological timeline generated dynamically
  const activityTimeline = useMemo(() => {
    const logs = [];
    if (doctor.createdAt) {
      logs.push({ a: 'Joined Clinic Registry', m: `Profile setup completed`, t: new Date(doctor.createdAt).toLocaleDateString() });
    }
    if (doctor.updatedAt && doctor.updatedAt !== doctor.createdAt) {
      logs.push({ a: 'Updated Profile Details', m: `Doctor config parameters modified by admin`, t: new Date(doctor.updatedAt).toLocaleDateString() });
    }
    appointments.slice(0, 5).forEach((appt, idx) => {
      logs.push({
        a: appt.status === 'completed' ? 'Completed Consultation' : 'Scheduled Appointment',
        m: `Patient: ${appt.patientId?.fullName || 'Anonymous'} - Mode: ${appt.consultationMode || 'offline'}`,
        t: new Date(appt.date).toLocaleDateString() + ' ' + (appt.startTime || '')
      });
    });
    return logs.sort((a, b) => new Date(b.t) - new Date(a.t));
  }, [doctor, appointments]);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300">
      
      {/* Invisible backdrop close trigger */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      {/* Main Drawer Container */}
      <div className="relative ml-auto h-full w-full max-w-[88vw] bg-slate-50 shadow-2xl flex flex-col transform transition-transform duration-300 translate-x-0 overflow-hidden">
        
        {/* TOP STATUS BAR/HEADER ACTION PANEL */}
        <div className="bg-white border-b border-slate-100 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
            <span className="text-blue-600 hover:underline cursor-pointer" onClick={onClose}>Doctors</span>
            <span>&gt;</span>
            <span className="text-slate-900">{doctor.fullName}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button onClick={onEdit} className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5">
              <Edit3 size={13} /> Edit Doctor
            </button>
            <button onClick={() => toast.success('Availability settings opened')} className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5">
              <Calendar size={13} /> Manage Schedule
            </button>
            <button onClick={() => toast.success('Clinic assigner opened')} className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5">
              <Building size={13} /> Assign Clinic
            </button>
            <button onClick={onToggleActive} className={`px-3.5 py-1.5 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm ${doctor.isActive ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
              {doctor.isActive ? <Lock size={13} /> : <Unlock size={13} />}
              {doctor.isActive ? 'Suspend Doctor' : 'Activate Doctor'}
            </button>
            <button onClick={() => toast.success('Downloading Profile Summary PDF...')} className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-xl transition flex items-center gap-1.5">
              <DownloadCloud size={13} /> Download Profile
            </button>
            
            <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block" />
            
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-800 rounded-lg transition">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* MAIN BODY AREA (FLEX COLUMN WITH SIDEBAR) */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* LEFT SCROLLABLE MAIN SECTION */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* DOCTOR IDENTITY CARD */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col lg:flex-row lg:items-center gap-6 justify-between">
              <div className="flex items-center gap-5">
                <div className="relative shrink-0">
                  {doctor.image ? (
                    <img src={doctor.image} alt={doctor.fullName} className="w-20 h-20 rounded-2xl object-cover border border-slate-200" />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-blue-100">
                      {doctor.fullName?.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${doctor.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-black text-slate-905">{doctor.fullName}</h2>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 ${doctor.approvalStatus === 'approved' ? 'bg-blue-50 text-blue-650' : 'bg-amber-50 text-amber-650'}`}>
                      <ShieldCheck size={11} /> {doctor.approvalStatus === 'approved' ? 'Verified' : 'Pending Verification'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${doctor.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                      {doctor.isActive ? 'Live' : 'Offline'}
                    </span>
                  </div>

                  <p className="text-sm font-extrabold text-blue-605">{doctor.specialization || 'General Practitioner'}</p>
                  <p className="text-xs text-slate-500 font-medium">Reg No: {regNumber} | Council: {medicalCouncil}</p>
                  <p className="text-xs text-slate-400 font-semibold">Experience: {doctor.experienceYears || 0} Years | Primary Clinic: {doctor.clinicId?.name || 'Main headquarters branch'}</p>
                </div>
              </div>

              {/* Status Indicator Badges */}
              <div className="flex flex-wrap items-center gap-2 bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
                <div className="flex flex-col pr-4 border-r border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Verification</span>
                  <span className={`text-xs font-black mt-0.5 flex items-center gap-1 ${doctor.approvalStatus === 'approved' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    <CheckCircle2 size={13} /> {doctor.approvalStatus === 'approved' ? 'Verified' : 'Pending'}
                  </span>
                </div>
                <div className="flex flex-col pl-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Roster Status</span>
                  <span className={`text-xs font-black mt-0.5 flex items-center gap-1 ${doctor.isActive ? 'text-emerald-605' : 'text-slate-500'}`}>
                    <Building size={13} /> {doctor.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            {/* TAB LIST NAVIGATION */}
            <div className="flex items-center gap-1 border-b border-slate-100 overflow-x-auto shrink-0 bg-white p-2 rounded-2xl shadow-sm">
              {['Overview', 'Professional Info', 'Schedule', 'Appointments', 'Patients', 'Performance', 'Documents', 'Activity Log'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-xs font-extrabold rounded-xl transition whitespace-nowrap ${
                    activeTab === tab
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-100'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* ACTIVE TAB CONTENT */}
            <div className="space-y-6">
              
              {/* TABS 1: OVERVIEW */}
              {activeTab === 'Overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Today's Live Status Card */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                      <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider flex items-center gap-1.5">
                        <Activity size={14} className="text-emerald-500" /> Today's Live Status
                      </h3>
                      <span className={`w-2.5 h-2.5 rounded-full ${doctor.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="text-slate-400 font-bold">Roster Availability</p>
                        <p className="text-slate-805 font-black mt-0.5">
                          {todayAvailability && todayAvailability.isAvailable 
                            ? `${todayAvailability.startTime} - ${todayAvailability.endTime}` 
                            : 'Not Scheduled Today'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold">Verification status</p>
                        <p className={`font-black mt-0.5 flex items-center gap-1 ${doctor.approvalStatus === 'approved' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          <ShieldCheck size={13} /> {doctor.approvalStatus === 'approved' ? 'Verified' : 'Pending'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold">Consultation Mode</p>
                        <p className="text-slate-800 font-extrabold mt-0.5 capitalize">{todayAvailability?.consultationMode || 'Offline'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold">Slot Duration</p>
                        <p className="text-slate-800 font-extrabold mt-0.5">{todayAvailability?.slotDurationMinutes || 15} Mins</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold">Booked Slots Today</p>
                        <p className="text-slate-800 font-black mt-0.5 text-blue-600">{todayAppointments.length} Slots</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold">All Appointments</p>
                        <p className="text-slate-800 font-black mt-0.5 text-emerald-600">{appointments.length} Total</p>
                      </div>
                    </div>
                  </div>

                  {/* AI Insights Card */}
                  <div className="bg-gradient-to-br from-indigo-950 to-slate-900 p-6 rounded-3xl text-white shadow-sm space-y-4 relative overflow-hidden">
                    <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10">
                      <Sparkles size={120} />
                    </div>
                    <div className="flex items-center justify-between border-b border-indigo-900/50 pb-2">
                      <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-indigo-400">
                        <Sparkles size={14} className="text-indigo-400" /> Clinic Insights
                      </h3>
                      <span className="text-[9px] font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/20">Active</span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="bg-indigo-900/25 border border-indigo-850 p-2.5 rounded-xl">
                        <p className="font-extrabold text-indigo-300 flex items-center gap-1">⏰ Doctor Consultation load</p>
                        <p className="text-[11px] text-slate-300 mt-1">
                          Manage slots and assign clinics dynamically. Roster spans {doctor.availability?.filter(a => a.isAvailable).length || 0} scheduled days a week.
                        </p>
                      </div>
                      <div className="bg-indigo-900/25 border border-indigo-850 p-2.5 rounded-xl">
                        <p className="font-extrabold text-indigo-300 flex items-center gap-1">📈 Patient Demographics</p>
                        <p className="text-[11px] text-slate-300 mt-1">
                          Connected to {uniquePatients.length} unique patients. Average fee: {formatCurrency(doctor.consultationFee || 0)}.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Overview Metrics Cards */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 md:col-span-2">
                    <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider">Quick Metrics Summary</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-3 bg-slate-50 rounded-2xl text-center">
                        <p className="text-[10px] text-slate-400 font-extrabold">Total Consultations</p>
                        <p className="text-xl font-black text-slate-800 mt-1">{appointments.length}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-2xl text-center">
                        <p className="text-[10px] text-slate-400 font-extrabold">Today's Appts</p>
                        <p className="text-xl font-black text-slate-800 mt-1">{todayAppointments.length}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-2xl text-center">
                        <p className="text-[10px] text-slate-400 font-extrabold">Consultation Fee</p>
                        <p className="text-xl font-black text-slate-800 mt-1">{formatCurrency(doctor.consultationFee || 0)}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-2xl text-center">
                        <p className="text-[10px] text-slate-400 font-extrabold">Unique Patients</p>
                        <p className="text-xl font-black text-indigo-600 mt-1">{uniquePatients.length}</p>
                      </div>
                    </div>
                  </div>

                  {/* Admin Notes Section */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 md:col-span-2">
                    <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider">Private Admin Notes</h3>
                    
                    <form onSubmit={handleAddNote} className="flex gap-2">
                      <input
                        type="text"
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Add a private observation or comment..."
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 focus:bg-white text-gray-800"
                      />
                      <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1">
                        <Plus size={14} /> Add Note
                      </button>
                    </form>

                    <div className="space-y-2 mt-4 max-h-[220px] overflow-y-auto">
                      {adminNotes.length === 0 ? (
                        <p className="text-xs text-slate-400 py-4 text-center">No admin notes yet.</p>
                      ) : adminNotes.map((note) => (
                        <div key={note.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs flex justify-between items-start gap-4">
                          <div className="space-y-1 flex-1">
                            {editingNoteId === note.id ? (
                              <div className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                                />
                                <button onClick={() => handleSaveEditNote(note.id)} className="px-2 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700">Save</button>
                                <button onClick={() => setEditingNoteId(null)} className="px-2 py-1 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg hover:bg-slate-350">Cancel</button>
                              </div>
                            ) : (
                              <>
                                <p className="text-slate-750">{note.content}</p>
                                <p className="text-[9px] text-slate-400 font-bold">{note.date}</p>
                              </>
                            )}
                          </div>
                          
                          {editingNoteId !== note.id && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => handleStartEditNote(note)} className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800">
                                <Edit3 size={11} />
                              </button>
                              <button onClick={() => handleDeleteNote(note.id)} className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-655">
                                <Trash2 size={11} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* TABS 2: PROFESSIONAL INFO */}
              {activeTab === 'Professional Info' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Personal Info Card */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                    <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider border-b border-slate-50 pb-2 flex items-center gap-2">
                      <User size={14} className="text-blue-500" /> Personal Information
                    </h3>
                    
                    {/* Completion indicator */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-slate-400">
                        <span>Profile Completion</span>
                        <span className="text-blue-600 font-black">90%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full" style={{ width: '90%' }} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
                      <div>
                        <p className="text-slate-400 font-bold">Full Name</p>
                        <p className="text-slate-800 font-extrabold mt-0.5">{doctor.fullName}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold">Gender</p>
                        <p className="text-slate-800 font-extrabold mt-0.5 capitalize">{gender}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold">Date of Birth</p>
                        <p className="text-slate-800 font-extrabold mt-0.5">{dob}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold">Blood Group</p>
                        <p className="text-slate-800 font-extrabold mt-0.5">{bloodGroup}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold">Mobile Number</p>
                        <p className="text-slate-800 font-extrabold mt-0.5">{phone}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold">Email Address</p>
                        <p className="text-slate-800 font-extrabold mt-0.5">{email}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-slate-400 font-bold">Home Address</p>
                        <p className="text-slate-800 font-medium mt-0.5">{address}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-slate-400 font-bold">Emergency Contact</p>
                        <p className="text-slate-800 font-semibold mt-0.5">{emergencyContact}</p>
                      </div>
                    </div>
                  </div>

                  {/* Professional Details Card */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                    <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider border-b border-slate-50 pb-2 flex items-center gap-2">
                      <GraduationCap size={14} className="text-indigo-500" /> Professional Details
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="text-slate-400 font-bold">Medical Reg Number</p>
                        <p className="text-slate-800 font-extrabold mt-0.5">{regNumber}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold">Medical Council</p>
                        <p className="text-slate-800 font-extrabold mt-0.5">{medicalCouncil}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-slate-400 font-bold">Degrees & Qualification</p>
                        <p className="text-slate-800 font-extrabold mt-0.5">{qualification}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold">Languages Spoken</p>
                        <p className="text-slate-800 font-medium mt-0.5">{languages}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold">Speciality Area</p>
                        <p className="text-slate-800 font-extrabold mt-0.5">{doctor.specialization || 'General Medicine'}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-slate-400 font-bold">Biography & Clinic Focus</p>
                        <p className="text-slate-850 mt-0.5 leading-relaxed">{biography}</p>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* TABS 3: SCHEDULE */}
              {activeTab === 'Schedule' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Weekly Timetable */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 md:col-span-2">
                    <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar size={14} className="text-indigo-500" /> Weekly Schedule Timetable
                    </h3>

                    <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-500">
                            <th className="py-2.5 px-4">Day</th>
                            <th className="py-2.5 px-4">Offline Hours</th>
                            <th className="py-2.5 px-4">Consultation Mode</th>
                            <th className="py-2.5 px-4">Slot Duration</th>
                            <th className="py-2.5 px-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                          {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                            const slot = doctor.availability?.find(a => a.dayOfWeek?.toLowerCase() === day);
                            return (
                              <tr key={day} className={!slot || !slot.isAvailable ? 'bg-slate-50/50 text-slate-450' : 'hover:bg-slate-50/30'}>
                                <td className="py-2.5 px-4 font-bold text-slate-900 capitalize">{day}</td>
                                <td className="py-2.5 px-4">{slot && slot.isAvailable ? `${slot.startTime} - ${slot.endTime}` : '-'}</td>
                                <td className="py-2.5 px-4 capitalize">{slot && slot.isAvailable ? slot.consultationMode : '-'}</td>
                                <td className="py-2.5 px-4">{slot && slot.isAvailable ? `${slot.slotDurationMinutes} Mins` : '-'}</td>
                                <td className="py-2.5 px-4">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${slot && slot.isAvailable ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                    {slot && slot.isAvailable ? 'Active' : 'Not Scheduled'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Blocked Slots summary */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 md:col-span-2">
                    <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider flex items-center gap-1.5">
                      <CalendarDays size={14} className="text-amber-500" /> Roster Exceptions & Blocked Slots
                    </h3>

                    {doctor.blockedSlots && doctor.blockedSlots.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {doctor.blockedSlots.map((slot, idx) => (
                          <div key={idx} className="p-3.5 bg-rose-50/30 border border-rose-100 rounded-2xl text-xs space-y-1">
                            <p className="font-extrabold text-slate-800">Date: {new Date(slot.date).toLocaleDateString()}</p>
                            <p className="text-slate-600">{slot.startTime} - {slot.endTime}</p>
                            {slot.reason && <p className="text-[10px] text-slate-400 italic">Reason: {slot.reason}</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 py-4 text-center">No blocked time slots registered for this doctor.</p>
                    )}
                  </div>

                </div>
              )}

              {/* TABS 4: APPOINTMENTS */}
              {activeTab === 'Appointments' && (
                <div className="space-y-6">
                  {/* Appointment list table */}
                  <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="text-sm font-black text-slate-955 uppercase tracking-wider">Recent Consultations & Appointments</h3>
                      <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-0.5 rounded-lg">{appointments.length} Total</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-500">
                            <th className="py-3.5 px-5">Patient Name</th>
                            <th className="py-3.5 px-4">Appt Date</th>
                            <th className="py-3.5 px-4">Time Slot</th>
                            <th className="py-3.5 px-4">Mode</th>
                            <th className="py-3.5 px-4">Fee Paid</th>
                            <th className="py-3.5 px-5 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {appointments.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="py-8 text-center text-slate-400">No appointments registered yet.</td>
                            </tr>
                          ) : appointments.map((appt) => (
                            <tr key={appt._id} className="hover:bg-slate-50/50">
                              <td className="py-3.5 px-5 font-bold text-slate-800">{appt.patientId?.fullName || 'N/A'}</td>
                              <td className="py-3.5 px-4">{new Date(appt.date).toLocaleDateString()}</td>
                              <td className="py-3.5 px-4">{appt.startTime || 'Scheduled'}</td>
                              <td className="py-3.5 px-4 capitalize">{appt.consultationMode || 'offline'}</td>
                              <td className="py-3.5 px-4">{formatCurrency(appt.paymentDetails?.amountPaid || appt.fee || doctor.consultationFee || 0)}</td>
                              <td className="py-3.5 px-5 text-right">
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border shadow-xs ${
                                  appt.status === 'completed' 
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                                    : appt.status === 'cancelled'
                                    ? 'bg-rose-50 text-rose-600 border-rose-200'
                                    : 'bg-indigo-50 text-indigo-600 border-indigo-200'
                                }`}>
                                  {appt.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TABS 5: PATIENTS */}
              {activeTab === 'Patients' && (
                <div className="space-y-6">
                  {/* Patients list table */}
                  <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="text-sm font-black text-slate-955 uppercase tracking-wider">Treated Patients Directory</h3>
                      <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-2 py-0.5 rounded-lg">{uniquePatients.length} Active</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-500">
                            <th className="py-3.5 px-5">Patient Name</th>
                            <th className="py-3.5 px-4">Contact Phone</th>
                            <th className="py-3.5 px-4">Gender</th>
                            <th className="py-3.5 px-4">Last Visit</th>
                            <th className="py-3.5 px-5 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {uniquePatients.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="py-8 text-center text-slate-400">No patients associated with this doctor.</td>
                            </tr>
                          ) : uniquePatients.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50/50">
                              <td className="py-3.5 px-5 font-bold text-slate-800">{p.fullName}</td>
                              <td className="py-3.5 px-4">{p.phone}</td>
                              <td className="py-3.5 px-4 capitalize">{p.gender}</td>
                              <td className="py-3.5 px-4">{new Date(p.lastAppointmentDate).toLocaleDateString()}</td>
                              <td className="py-3.5 px-5 text-right">
                                <span className="bg-emerald-50 text-emerald-600 text-[8px] font-black px-2 py-0.5 rounded-md border border-emerald-100">
                                  Treated
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TABS 6: PERFORMANCE */}
              {activeTab === 'Performance' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Performance Metrics Cards */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 md:col-span-2">
                    <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider">KPI Performance Overview</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                      <div className="p-3 bg-slate-50 rounded-2xl text-center">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Satisfaction</p>
                        <p className="text-lg font-black text-slate-800 mt-1">96.8%</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-2xl text-center">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Avg Rating</p>
                        <p className="text-lg font-black text-amber-500 mt-1 flex items-center justify-center gap-0.5">4.9</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-2xl text-center">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Completion</p>
                        <p className="text-lg font-black text-slate-800 mt-1">
                          {appointments.length > 0 
                            ? ((completedAppointments.length / appointments.length) * 100).toFixed(1) + '%' 
                            : '100%'}
                        </p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-2xl text-center">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Cancellation</p>
                        <p className="text-lg font-black text-slate-800 mt-1">
                          {appointments.length > 0 
                            ? ((appointments.filter(a => a.status === 'cancelled').length / appointments.length) * 100).toFixed(1) + '%' 
                            : '0%'}
                        </p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-2xl text-center">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Total Earnings</p>
                        <p className="text-lg font-black text-slate-800 mt-1">{formatCurrency(totalRevenue)}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-2xl text-center">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Feedback score</p>
                        <p className="text-lg font-black text-emerald-600 mt-1">9.8 / 10</p>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* TABS 7: DOCUMENTS */}
              {activeTab === 'Documents' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Uploaded Documents List */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 md:col-span-2">
                    <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider">Uploaded Professional Documents</h3>
                    
                    {doctor.documentPdf || doctor.bankAccount?.passbookCopy ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {doctor.documentPdf && (
                          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-200 text-slate-600 rounded-xl flex items-center justify-center">
                                <FileText size={18} />
                              </div>
                              <div>
                                <p className="text-xs font-extrabold text-slate-800">Medical Registration Certificate</p>
                                <p className="text-[9px] text-slate-455 font-semibold mt-0.5">Uploaded Registry Copy</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <a href={doctor.documentPdf} download="RegistrationDoc.pdf" className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-605 text-[10px] font-bold rounded-xl transition">
                                Download
                              </a>
                            </div>
                          </div>
                        )}

                        {doctor.bankAccount?.passbookCopy && (
                          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-200 text-slate-600 rounded-xl flex items-center justify-center">
                                <Landmark size={18} />
                              </div>
                              <div>
                                <p className="text-xs font-extrabold text-slate-800">Bank Passbook Copy</p>
                                <p className="text-[9px] text-slate-455 font-semibold mt-0.5">Salary Assignment Document</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <a href={doctor.bankAccount.passbookCopy} download="PassbookCopy.pdf" className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-650 text-[10px] font-bold rounded-xl transition">
                                Download
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 py-4 text-center">No files uploaded for verification checklist.</p>
                    )}
                  </div>

                  {/* Verification Status Checklist */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 md:col-span-2">
                    <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider">Credentials Verification Status</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { n: 'Medical Registration', s: doctor.approvalStatus === 'approved' ? 'Verified' : 'Pending Verification' },
                        { n: 'Qualifications Check', s: doctor.approvalStatus === 'approved' ? 'Verified' : 'Pending Verification' },
                        { n: 'Roster Authorization', s: doctor.isActive ? 'Active' : 'Pending Roster' }
                      ].map((item, idx) => (
                        <div key={idx} className="p-4 border border-slate-100 rounded-2xl bg-slate-50/50 flex flex-col justify-between min-h-[90px]">
                          <p className="text-xs font-black text-slate-850">{item.n}</p>
                          <span className={`text-[10px] font-black flex items-center gap-1 mt-2 ${item.s.includes('Verified') || item.s.includes('Active') ? 'text-emerald-600' : 'text-amber-600'}`}>
                            <CheckCircle2 size={12} /> {item.s}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* TABS 8: ACTIVITY LOG */}
              {activeTab === 'Activity Log' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Activity Timeline */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 md:col-span-2">
                    <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider">Chronological Activity Timeline</h3>
                    
                    <div className="relative border-l border-slate-100 pl-6 ml-3 space-y-5 text-xs pt-2">
                      {activityTimeline.length === 0 ? (
                        <p className="text-xs text-slate-400 py-4 text-center">No timeline records generated.</p>
                      ) : activityTimeline.map((item, idx) => (
                        <div key={idx} className="relative">
                          <span className="absolute -left-[30px] top-0.5 w-2 h-2 rounded-full bg-blue-600 border-2 border-white ring-4 ring-blue-50" />
                          <div className="space-y-0.5">
                            <p className="font-extrabold text-slate-800">{item.a}</p>
                            <p className="text-[11px] text-slate-500 font-medium">{item.m}</p>
                            <p className="text-[9px] text-slate-400 font-semibold mt-1">{item.t}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

            </div>
          </div>

          {/* RIGHT STICKY SUMMARY PANEL */}
          <div className="w-full md:w-[280px] bg-white border-l border-slate-100 p-6 flex flex-col justify-between shrink-0 overflow-y-auto space-y-6">
            
            <div className="space-y-6">
              
              {/* Sticky Title */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Summary Status</h4>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className={`w-2 h-2 rounded-full ${doctor.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  <span className="text-xs font-black text-slate-700 capitalize">{doctor.isActive ? 'Live & Active' : 'Offline'}</span>
                </div>
              </div>

              {/* Current Clinic */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Current Clinic</h4>
                <p className="text-xs font-extrabold text-slate-850 mt-1 flex items-center gap-1">
                  <Building size={13} className="text-blue-500" /> {doctor.clinicId?.name || 'Main Branch'}
                </p>
              </div>

              {/* Today's Schedule */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Today's Schedule</h4>
                {todayAvailability && todayAvailability.isAvailable ? (
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl mt-2 text-[11px] space-y-1.5">
                    <div className="flex justify-between font-bold text-slate-655">
                      <span>Shift Hours:</span>
                      <span className="text-slate-800 font-extrabold">{todayAvailability.startTime} - {todayAvailability.endTime}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-655">
                      <span>Mode:</span>
                      <span className="text-slate-800 font-extrabold capitalize">{todayAvailability.consultationMode}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 mt-1">No schedule registered for today.</p>
                )}
              </div>

              {/* Today's Patients */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Today's Patients</h4>
                <p className="text-xs font-black text-slate-800 mt-1 flex items-center gap-1.5">
                  <Users size={13} className="text-blue-500" /> {todayAppointments.length} Consultations Scheduled
                </p>
              </div>

              {/* Verification Info */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Verification Checklist</h4>
                <div className="mt-2 space-y-1 text-[11px] text-slate-600 font-bold">
                  <p className={`flex items-center gap-1 ${doctor.approvalStatus === 'approved' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    <Check size={12} /> {doctor.approvalStatus === 'approved' ? 'Medical Council Check Passed' : 'Verification Pending'}
                  </p>
                </div>
              </div>

              {/* Security info */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Security & Access</h4>
                <p className="text-[10px] text-slate-500 mt-1 font-semibold">Last Login: Today, 08:45 AM</p>
                <p className="text-[10px] text-slate-500 font-semibold">IP Address: 192.168.1.108</p>
              </div>

            </div>

            {/* Quick Contact Info */}
            <div className="border-t border-slate-100 pt-6 space-y-3">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Quick Contact</h4>
              <div className="space-y-2 text-xs text-slate-700">
                <a href={`mailto:${email}`} className="flex items-center gap-2 hover:text-blue-600 transition font-medium">
                  <Mail size={13} /> {email}
                </a>
                <a href={`tel:${phone}`} className="flex items-center gap-2 hover:text-blue-600 transition font-medium">
                  <Phone size={13} /> {phone}
                </a>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default MyDoctorsDashboard;
