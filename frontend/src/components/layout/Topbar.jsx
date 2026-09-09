import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import io from 'socket.io-client';
import { 
  Menu, Bell, Settings, BarChart2, User, Calendar, Search, 
  MessageSquare, LogOut, ChevronDown, Sparkles, Shield, AlertCircle,
  HelpCircle, Eye, ShieldAlert, CheckCircle, Info, RefreshCw, X
} from 'lucide-react';
import Avatar from '../ui/Avatar';
import { ROLES } from '../../constants/roles';
import { patientApi, apiClient, notificationApi } from '../../lib/api';
import pehalLogo from '../../assets/pehal_logo.svg';

const Topbar = ({ title, currentUser, sidebarOpen, onToggleSidebar, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const profileRef = useRef(null);
  const notificationRef = useRef(null);
  const branchRef = useRef(null);

  const isPatient = currentUser?.role === ROLES.PATIENT;
  const clinicId = currentUser?.clinicId || currentUser?.clinic?._id;

  // Fetch Notification Logs from TanStack Query
  const { data: notificationsData } = useQuery({
    queryKey: ['dashboard', 'notification-logs', clinicId],
    queryFn: () => notificationApi.listLogs({ limit: 10 }),
    enabled: !!clinicId && !isPatient,
    staleTime: 30000
  });

  const rawLogs = notificationsData?.items || notificationsData?.data?.items || [];
  const unreadCount = useMemo(() => {
    return rawLogs.filter(log => log.status === 'pending' || log.status === 'dispatched').length;
  }, [rawLogs]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (!clinicId || isPatient) return;

    const token = localStorage.getItem('ai_cms_access_token') || localStorage.getItem('token');
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      auth: { token }
    });

    socket.on('connect', () => {
      socket.emit('join_clinic', clinicId);
    });

    const triggerNotificationsRefresh = () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'notification-logs', clinicId] });
    };

    socket.on('appointment:booked', triggerNotificationsRefresh);
    socket.on('appointment:checked_in', triggerNotificationsRefresh);
    socket.on('appointment:cancelled', triggerNotificationsRefresh);
    socket.on('appointment:rescheduled', triggerNotificationsRefresh);
    socket.on('appointment:completed', triggerNotificationsRefresh);
    socket.on('staff:online', triggerNotificationsRefresh);
    socket.on('staff:offline', triggerNotificationsRefresh);

    return () => {
      socket.disconnect();
    };
  }, [clinicId, isPatient, queryClient]);

  // Click outside handling for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationDropdownOpen(false);
      }
      if (branchRef.current && !branchRef.current.contains(event.target)) {
        setBranchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const clinicName = currentUser?.clinic?.name || 'Ram\'s Dental Clinic';
  const ownerName = currentUser?.name || 'King';
  const isSuperAdmin = currentUser?.role === ROLES.SUPER_ADMIN;

  const roleLabel = useMemo(() => {
    if (currentUser?.role === ROLES.PATIENT) return 'Patient';
    if (currentUser?.role === ROLES.SUPER_ADMIN) return 'Super Administrator';
    if (currentUser?.role === ROLES.ADMIN) return 'Clinic Owner';
    if (currentUser?.role === ROLES.DOCTOR) return currentUser?.specialization?.name || 'Doctor';
    if (currentUser?.role === ROLES.RECEPTIONIST) return 'Receptionist';
    if (currentUser?.role === ROLES.LAB_TECHNICIAN) return 'Lab Technician';
    if (currentUser?.role === ROLES.PHARMACIST) return 'Pharmacist';
    return 'Staff';
  }, [currentUser]);

  // Dynamic Settings navigation target based on role permissions
  const settingsLink = useMemo(() => {
    if (currentUser?.role === ROLES.ADMIN) return { label: 'Clinic Settings', path: '/clinic/settings' };
    if (currentUser?.role === ROLES.DOCTOR) return { label: 'Doctor Availability', path: `/doctors/${currentUser?._id}/availability` };
    if (currentUser?.role === ROLES.PATIENT) return { label: 'My Profile', path: '/portal?tab=profile' };
    return null;
  }, [currentUser]);

  // Format today's date
  const todayStr = useMemo(() => {
    const d = new Date();
    const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
    const formatted = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    return { dayName, formatted };
  }, []);

  const handleLogoutClick = () => {
    if (window.confirm('Are you sure you want to logout from AI-CMS Enterprise?')) {
      onLogout();
    }
  };

  const getNotificationIcon = (title = '') => {
    const lower = title.toLowerCase();
    if (lower.includes('book') || lower.includes('appointment')) return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    if (lower.includes('cancel')) return <ShieldAlert className="w-4 h-4 text-rose-500" />;
    if (lower.includes('check') || lower.includes('online')) return <RefreshCw className="w-4 h-4 text-blue-500" />;
    return <Info className="w-4 h-4 text-slate-400" />;
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 h-16 bg-white border-b border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] backdrop-blur-xl transition-all duration-300">
      
      {/* 1. Left Section: Sidebar Toggle & Dynamic Branding */}
      <div className="flex items-center justify-between w-full xl:w-auto xl:justify-start gap-4 shrink-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          className="p-1.5 border-2 border-black rounded-none text-slate-900 hover:bg-slate-50 transition duration-200 active:scale-95 shrink-0"
        >
          <Menu size={18} />
        </button>

        {/* Branding block */}
        <div className="flex items-center justify-center flex-1 xl:flex-none gap-2.5">
          <img src={pehalLogo} alt="Pehal" className="h-8 object-contain shrink-0" />
          <div className="leading-none shrink-0 text-left">
            <p className="text-[14px] font-black text-slate-955 tracking-tight">AICMS</p>
            <p className="text-[8px] font-black text-slate-455 uppercase tracking-widest mt-0.5">AI-CMS Enterprise</p>
          </div>
        </div>

        {/* Empty placeholder to keep branding centered on mobile */}
        <div className="w-8 xl:hidden"></div>

        {/* Vertical divider visible only when branding is present */}
        <div className={`h-6 w-px bg-slate-200/60 transition-all duration-500 xl:block hidden ${!sidebarOpen ? 'opacity-100 mx-0.5 lg:mx-1' : 'opacity-0 w-0'}`} />

        {/* Clinic Info pill card — hidden for Super Admin and on mobile/tablet */}
        {!isPatient && !isSuperAdmin && (
          <div className="relative hidden xl:block" ref={branchRef}>
            <button
              onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
              className="flex items-center gap-2 lg:gap-2.5 bg-slate-55 bg-slate-50 hover:bg-slate-100/80 border border-slate-150 rounded-full px-2.5 lg:px-3.5 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition duration-200 cursor-pointer active:scale-98 group"
            >
              <span className="text-xs">🏥</span>
              <div className="text-left leading-none">
                <span className="text-[10px] lg:text-[11px] font-black text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors">{clinicName}</span>
                <span className="block text-[8px] text-slate-400 font-bold mt-0.5">Indirapuram Branch</span>
              </div>
              <ChevronDown size={11} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 text-[8px] font-black px-1.5 lg:px-2 py-0.5 rounded-full border border-emerald-100/50">
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            </button>

            {branchDropdownOpen && (
              <div className="absolute left-0 mt-2 w-52 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider px-3 py-1 border-b border-slate-50">Select Branch</p>
                <button onClick={() => setBranchDropdownOpen(false)} className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-blue-600 bg-blue-50/50 rounded-xl mt-1 text-left">
                  <span>Indirapuram Branch</span>
                  <span className="text-[8px] bg-blue-100 px-1.5 py-0.5 rounded-full font-bold">Active</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Middle Section: Search Bar — hidden for Super Admin and smaller viewports */}
      {!isSuperAdmin && (
        <div className="hidden lg:flex items-center gap-4 flex-1 max-w-lg mx-8 relative">
          <div className="relative w-full">
            <input
              id="global-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              placeholder="Search patients, appointments, invoices, staff, doctors..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-12 py-2 text-xs text-slate-850 placeholder:text-slate-400/90 focus:outline-none focus:bg-white focus:border-blue-600 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)] transition duration-200"
            />
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-slate-200/60 border border-slate-300/40 rounded px-1.5 py-0.5 text-[8px] font-black text-slate-500 uppercase tracking-widest pointer-events-none select-none">
              Ctrl + K
            </div>
          </div>
        </div>
      )}

      {/* 3. Right Section: Date, Actions, Profile Dropdown */}
      <div className="hidden xl:flex items-center gap-2 lg:gap-3 shrink-0">
        
        {/* Today's Date card — hidden for Super Admin and on mobile/tablet */}
        {!isSuperAdmin && (
          <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-150 rounded-full px-3.5 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:bg-slate-100/80 transition duration-200 select-none">
            <Calendar size={13} className="text-slate-500" />
            <div className="text-left leading-none">
              <span className="text-[10px] font-black text-slate-805 tracking-tight">{todayStr.formatted}</span>
              <span className="block text-[8px] text-slate-400 font-bold mt-0.5">{todayStr.dayName}</span>
            </div>
          </div>
        )}

        {/* Chat / Messages Button — hidden for Super Admin and on mobile/tablet */}
        {!isSuperAdmin && (
          <button
            onClick={() => isPatient ? navigate('/portal?tab=support') : navigate('/chat')}
            aria-label="Clinic Chat"
            title="Clinic Chat"
            className="p-2 lg:p-2.5 rounded-full text-slate-500 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 border border-slate-150 transition duration-200 active:scale-95 hover:shadow-[0_0_10px_rgba(37,99,235,0.05)] cursor-pointer"
          >
            <MessageSquare size={14} />
          </button>
        )}

        {/* Notification Bell Dropdown — hidden for Super Admin and on mobile/tablet */}
        {!isSuperAdmin && (
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
              aria-label="Notifications"
              className="p-2 lg:p-2.5 rounded-full text-slate-500 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-600 border border-slate-150 transition duration-200 active:scale-95 hover:shadow-[0_0_10px_rgba(16,185,129,0.05)] cursor-pointer relative"
            >
              <Bell size={14} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
              )}
            </button>

            {notificationDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white border border-slate-200 shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                  <span className="text-xs font-black text-slate-800">Notifications</span>
                  <span className="text-[10px] font-bold text-slate-400">{unreadCount} Unread</span>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-50 mt-2">
                  {rawLogs.length === 0 ? (
                    <p className="text-[10px] text-slate-400 font-bold text-center py-6">No recent notifications</p>
                  ) : (
                    rawLogs.map(log => (
                      <div key={log._id} className="py-2.5 flex items-start gap-3 hover:bg-slate-50 rounded-lg px-2 transition">
                        <div className="mt-0.5">{getNotificationIcon(log.title)}</div>
                        <div>
                          <p className="text-[11px] font-black text-slate-800 leading-tight">{log.title}</p>
                          <p className="text-[9px] text-slate-400 font-bold mt-0.5 leading-tight">{log.message}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Profile Avatar Dropdown — Super Admin variant shows shield icon and correct role */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2 bg-slate-50 border border-slate-150 rounded-full pl-2 pr-3 py-1 hover:bg-slate-100/60 transition duration-200 cursor-pointer active:scale-98 group"
          >
            {isSuperAdmin ? (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shrink-0 shadow-sm">
                <Shield size={14} className="text-white" />
              </div>
            ) : (
              <Avatar src={currentUser?.avatar} name={ownerName} size="w-8 h-8 rounded-full border border-slate-200 shadow-xs shrink-0" />
            )}
            <div className="text-left leading-none">
              <p className="text-[10px] lg:text-[11px] font-black text-slate-850 tracking-tight group-hover:text-blue-600 transition-colors">{isSuperAdmin ? 'Super Admin' : `${ownerName}!`}</p>
              <span className="block text-[8px] text-slate-450 font-bold mt-0.5">{roleLabel}</span>
            </div>
            <ChevronDown size={11} className="text-slate-450 group-hover:text-slate-600 transition-colors" />
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl p-2.5 z-50 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="px-3.5 py-2.5 border-b border-slate-50 leading-none">
                <p className="text-xs font-black text-slate-900">{ownerName}</p>
                <span className="text-[9px] text-slate-400 font-bold block mt-1">{currentUser?.email || 'user@peheal.com'}</span>
              </div>
              <div className="mt-1.5 space-y-0.5">
                {settingsLink && (
                  <Link to={settingsLink.path} onClick={() => setProfileDropdownOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition">
                    <Settings size={14} className="text-slate-400" />
                    <span>{settingsLink.label}</span>
                  </Link>
                )}
                <button onClick={handleLogoutClick} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition text-left">
                  <LogOut size={14} className="text-rose-455" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

    </header>
  );
};

export default Topbar;
