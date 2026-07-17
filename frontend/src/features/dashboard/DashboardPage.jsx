import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { dashboardApi, clinicApi } from '../../lib/api';
import { getAppointments } from '../appointments/appointmentApi';
import {
  Calendar as CalendarIcon, Users, DollarSign, Clock, ArrowUpRight, Plus, 
  UserPlus, FileText, Activity, Bell, AlertTriangle, Sparkles, 
  Database, ChevronRight, TrendingUp, MoreVertical, Star, Sparkle, PlusSquare
} from 'lucide-react';
import LoadingState from '../../components/common/LoadingState';

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [onboardingFlow, setOnboardingFlow] = useState(null);
  const [recentAppointments, setRecentAppointments] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [overviewRes, onboardingRes, apptsRes] = await Promise.all([
          dashboardApi.getOverview(),
          user?.clinicId ? clinicApi.getOnboardingFlow(user.clinicId) : Promise.resolve({ data: null }),
          getAppointments({ limit: 5 }).catch(() => ({ data: { appointments: [] } }))
        ]);
        setStats(overviewRes?.data || {});
        setOnboardingFlow(onboardingRes?.data);
        setRecentAppointments(apptsRes?.data?.appointments || []);
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [user]);

  if (loading) {
    return <LoadingState label="Loading clinic workspace..." />;
  }

  const cardStats = stats?.cards || {};
  const todayAppointments = cardStats.todayAppointments ?? 0;
  const totalPatientsCount = cardStats.totalPatients ?? 0;
  const todayRevenue = cardStats.amountReceived ?? 0;
  const pendingBillsCount = cardStats.pendingInvoices ?? 0;
  const pendingBillsAmount = cardStats.pendingInvoicesAmount ?? 0; 
  const newPatientsThisMonth = cardStats.newPatients ?? 0;

  const maxDoctors = onboardingFlow?.limits?.maxDoctors ?? 5;
  const currentDoctors = onboardingFlow?.counts?.doctors ?? 0;
  const maxStaff = onboardingFlow?.limits?.maxStaff ?? 10;
  const currentStaff = onboardingFlow?.counts?.staff ?? 0;
  const maxDepartments = onboardingFlow?.limits?.maxDepartments ?? 4;
  const currentDepartments = onboardingFlow?.counts?.departments ?? 0;

  return (
    <div className="space-y-6 bg-slate-50/50 min-h-screen p-1">
      {/* Welcome Banner Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Welcome back, {user?.name || 'Dr. Rahul'}! 👋
          </h1>
          <p className="text-xs text-slate-400 mt-1">Here's what's happening in your clinic today.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <button className="px-4 py-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm text-xs font-bold text-slate-700 flex items-center gap-2.5">
              <CalendarIcon className="w-4 h-4 text-slate-400" />
              <span>{new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })}</span>
            </button>
          </div>

          <button
            onClick={() => navigate('/appointments/new')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-md"
          >
            <Plus className="w-4 h-4" /> New Appointment
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 bg-purple-50 text-purple-650 rounded-xl flex items-center justify-center">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
              Live updates
            </span>
          </div>
          <div className="mt-4 flex justify-between items-end">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Appointments</p>
              <h3 className="text-3xl font-black text-slate-950 mt-1">{todayAppointments}</h3>
            </div>
            <svg className="w-20 h-10 stroke-purple-500 fill-none" viewBox="0 0 100 40">
              <path d="M 0 35 Q 20 20 40 25 T 80 10 T 100 5" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-emerald-650 bg-emerald-55 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
              Total Scope
            </span>
          </div>
          <div className="mt-4 flex justify-between items-end">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Patients</p>
              <h3 className="text-3xl font-black text-slate-950 mt-1">{totalPatientsCount.toLocaleString()}</h3>
            </div>
            <svg className="w-20 h-10 stroke-blue-500 fill-none" viewBox="0 0 100 40">
              <path d="M 0 30 Q 30 35 60 15 T 100 5" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
              This Cycle
            </span>
          </div>
          <div className="mt-4 flex justify-between items-end">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Revenue</p>
              <h3 className="text-2xl font-black text-slate-950 mt-1">₹{todayRevenue.toLocaleString()}</h3>
            </div>
            <svg className="w-20 h-10 stroke-emerald-55 stroke-emerald-500 fill-none" viewBox="0 0 100 40">
              <path d="M 0 35 Q 25 15 50 30 T 100 5" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div className="text-right">
              <span className="text-[9px] font-bold text-slate-400 block uppercase">Pending Bills</span>
              <span className="text-xs font-black text-slate-900 block">{pendingBillsCount} Invoices</span>
            </div>
          </div>
          <div className="mt-4 flex justify-between items-end">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Due Amount</p>
              <h3 className="text-2xl font-black text-amber-605 mt-1">₹{pendingBillsAmount.toLocaleString()}</h3>
            </div>
            <svg className="w-20 h-10 stroke-amber-500 fill-none" viewBox="0 0 100 40">
              <path d="M 0 30 Q 30 10 70 25 T 100 15" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Metric 5 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 bg-teal-50 text-teal-655 rounded-xl flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Registration
            </span>
          </div>
          <div className="mt-4 flex justify-between items-end">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">New Patients (Month)</p>
              <h3 className="text-3xl font-black text-slate-955 mt-1">{newPatientsThisMonth}</h3>
            </div>
            <svg className="w-20 h-10 stroke-teal-500 fill-none" viewBox="0 0 100 40">
              <path d="M 0 35 Q 20 20 50 30 T 100 10" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

      </div>

      {/* Main Spline Grid Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Column 1: Appointments Spline Chart */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[440px]">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <div>
              <h3 className="text-sm font-black text-slate-950">Appointments Overview</h3>
              <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-405 font-bold">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Completed</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Upcoming</span>
              </div>
            </div>
          </div>

          <div className="h-52 relative w-full pt-4">
            <svg viewBox="0 0 500 150" className="w-full h-full overflow-visible">
              <path d="M 0,110 Q 75,50 150,80 T 300,40 T 450,70 T 500,60" fill="none" stroke="#3b82f6" strokeWidth="2.5" />
              <path d="M 0,130 Q 70,80 140,110 T 290,70 T 440,90 T 500,80" fill="none" stroke="#10b981" strokeWidth="2.5" />
              <line x1="0" y1="150" x2="500" y2="150" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="100" x2="500" y2="100" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3" />
              <line x1="0" y1="50" x2="500" y2="50" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3" />
            </svg>
            <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[9px] text-slate-400 px-2 pt-2 border-t border-slate-50">
              <span>8 AM</span>
              <span>11 AM</span>
              <span>2 PM</span>
              <span>5 PM</span>
              <span>8 PM</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-2.5 rounded-2xl bg-emerald-50/50 border border-emerald-100/50 text-center">
              <span className="text-[10px] text-emerald-650 font-bold block">{cardStats.completedConsultations ?? 0} Completed</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-blue-50/50 border border-blue-100/50 text-center">
              <span className="text-[10px] text-blue-600 font-bold block">{cardStats.pendingAppointments ?? 0} Upcoming</span>
            </div>
          </div>
        </div>

        {/* Column 2: Recent Appointments */}
        <div className="lg:col-span-3 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[440px]">
          <div className="flex justify-between items-center border-b border-slate-50 pb-3 mb-2">
            <h3 className="font-black text-slate-950 text-xs">Recent Appointments</h3>
            <button onClick={() => navigate('/appointments')} className="text-[10px] text-blue-600 font-bold hover:underline">View All</button>
          </div>

          <div className="space-y-3.5 flex-1 mt-2 overflow-y-auto max-h-[300px]">
            {recentAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 text-xs">
                <span>No appointments today.</span>
              </div>
            ) : (
              recentAppointments.map((app) => (
                <div key={app._id} className="flex items-center justify-between text-xs p-1">
                  <div className="flex items-center gap-3">
                    <div className="text-left min-w-[60px]">
                      <p className="font-extrabold text-[10px] text-slate-905">{app.startTime}</p>
                      <span className="text-[8px] text-slate-400 font-semibold block mt-0.5">{app.appointmentType}</span>
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-[11px] leading-none">{app.patientId?.fullName}</p>
                      <span className="text-[9px] text-slate-400 font-medium block mt-1">{app.patientId?.gender}, {app.patientId?.age} Y</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-600 capitalize">
                    {app.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Quick Actions & Alerts */}
        <div className="lg:col-span-3 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[440px] space-y-4">
          <div>
            <h3 className="font-black text-slate-950 text-xs mb-3">Quick Actions</h3>
            <div className="grid grid-cols-4 gap-2">
              <button onClick={() => navigate('/appointments/new')} className="flex flex-col items-center p-1.5 bg-slate-50 hover:bg-purple-50/50 rounded-2xl border border-slate-100 transition group text-center">
                <span className="text-xs mb-1 group-hover:scale-110 transition">📅</span>
                <span className="text-[8px] font-bold text-slate-500 leading-tight">New Appt</span>
              </button>
              <button onClick={() => navigate('/patients')} className="flex flex-col items-center p-1.5 bg-slate-50 hover:bg-blue-50/50 rounded-2xl border border-slate-100 transition group text-center">
                <span className="text-xs mb-1 group-hover:scale-110 transition">👤</span>
                <span className="text-[8px] font-bold text-slate-500 leading-tight">Add Patient</span>
              </button>
              <button onClick={() => navigate('/billing')} className="flex flex-col items-center p-1.5 bg-slate-50 hover:bg-emerald-50/50 rounded-2xl border border-slate-100 transition group text-center">
                <span className="text-xs mb-1 group-hover:scale-110 transition">💵</span>
                <span className="text-[8px] font-bold text-slate-500 leading-tight">Create Invoice</span>
              </button>
              <button onClick={() => navigate('/admin/my-doctors-dashboard')} className="flex flex-col items-center p-1.5 bg-slate-50 hover:bg-indigo-50/50 rounded-2xl border border-slate-100 transition group text-center">
                <span className="text-xs mb-1 group-hover:scale-110 transition">🩺</span>
                <span className="text-[8px] font-bold text-slate-500 leading-tight">Add Doctor</span>
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-3 flex-1 flex flex-col justify-end">
            <div className="flex justify-between items-center">
              <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wide">Alerts & Notifications</h4>
            </div>

            <div className="space-y-2 text-[10px]">
              {cardStats.lowStockMedicines > 0 && (
                <div className="flex items-start gap-2.5 p-2 bg-red-50/50 border border-red-100/50 rounded-xl">
                  <AlertTriangle size={14} className="text-rose-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-extrabold text-slate-900 leading-tight">Low Stock Alert</p>
                    <span className="text-slate-500 text-[9px]">Some medicines are below reorder levels.</span>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2.5 p-2 bg-blue-50/50 border border-blue-100/50 rounded-xl">
                <Database size={14} className="text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-extrabold text-slate-900 leading-tight">System Status</p>
                  <span className="text-slate-500 text-[9px]">Clinic active database synchronized.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Plan Usage Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-12 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-50 pb-3">
            <div>
              <h3 className="text-xs font-black text-slate-955">Plan & Usage Summary</h3>
              <p className="text-[9px] text-slate-400">Current resource allocation and limits.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">AI Professional Clinic</p>
                <span className="text-[9px] text-emerald-600 font-bold block mt-1">Valid till {new Date(user?.clinic?.subscription?.expiryDate || '2025-12-25').toLocaleDateString('en-US')}</span>
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-500">Doctors</span>
                  <span className="text-slate-900">{currentDoctors} / {maxDoctors}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(currentDoctors/maxDoctors)*100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-500">Staff Limit</span>
                  <span className="text-slate-900">{currentStaff} / {maxStaff}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(currentStaff/maxStaff)*100}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default DashboardPage;
