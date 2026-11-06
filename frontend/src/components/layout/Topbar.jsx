import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import io from 'socket.io-client';
import { 
  Bell, Settings, BarChart2, User, Calendar, Search, 
  MessageSquare, LogOut, ChevronDown, Sparkles, Shield, AlertCircle,
  HelpCircle, Eye, ShieldAlert, CheckCircle, Info, RefreshCw, X,
  KeyRound, Edit3
} from 'lucide-react';
import Avatar from '../ui/Avatar';
import { ROLES } from '../../constants/roles';
import { patientApi, apiClient, notificationApi, chatApi } from '../../lib/api';
import pehalLogo from '../../assets/pehal_logo.svg';
import { 
  ViewProfileModal, 
  EditProfileModal, 
  ChangePasswordModal 
} from '../profile/ProfileModals';

const Topbar = ({ title, currentUser, sidebarOpen, onToggleSidebar, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Profile Action Modals State
  const [viewProfileOpen, setViewProfileOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const profileRef = useRef(null);
  const notificationRef = useRef(null);
  const branchRef = useRef(null);

  const isPatient = currentUser?.role === ROLES.PATIENT;
  const isSuperAdmin = currentUser?.role === ROLES.SUPER_ADMIN;
  const clinicId = currentUser?.clinicId || currentUser?.clinic?._id;

  // Real-time unread notifications count query
  const { data: unreadNotifRes } = useQuery({
    queryKey: ['user-notifications-unread', clinicId],
    queryFn: () => notificationApi.getUnreadCount(),
    enabled: !isSuperAdmin && !!clinicId,
    staleTime: 15000
  });

  const unreadNotifCount = useMemo(() => {
    return unreadNotifRes?.data?.count ?? unreadNotifRes?.count ?? 0;
  }, [unreadNotifRes]);

  // Real-time unread messages count query
  const { data: conversationsRes } = useQuery({
    queryKey: ['conversations', currentUser?._id],
    queryFn: () => chatApi.getConversations(),
    enabled: !isSuperAdmin && !!currentUser?._id,
    staleTime: 15000
  });

  const conversations = useMemo(() => {
    return conversationsRes?.conversations || conversationsRes?.data?.conversations || [];
  }, [conversationsRes]);

  const unreadMessagesCount = useMemo(() => {
    return conversations.reduce((acc, c) => {
      const count = typeof c.unreadCount === 'number' 
        ? c.unreadCount 
        : (currentUser?.role === ROLES.RECEPTIONIST ? c.unreadCount?.receptionist : c.unreadCount?.doctor) || 0;
      return acc + count;
    }, 0);
  }, [conversations, currentUser?.role]);

  // Fetch in-app notifications for dropdown
  const { data: notificationsData } = useQuery({
    queryKey: ['user-notifications', clinicId],
    queryFn: () => notificationApi.listUserNotifications({ limit: 10 }),
    enabled: !!clinicId && !isSuperAdmin && notificationDropdownOpen,
    staleTime: 15000
  });

  const rawNotifications = useMemo(() => {
    return notificationsData?.data?.items || notificationsData?.items || [];
  }, [notificationsData]);

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
      queryClient.invalidateQueries({ queryKey: ['user-notifications-unread', clinicId] });
      queryClient.invalidateQueries({ queryKey: ['user-notifications', clinicId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', currentUser?._id] });
    };

    socket.on('notification:new', triggerNotificationsRefresh);
    socket.on('notification:update', triggerNotificationsRefresh);
    socket.on('notification:read', triggerNotificationsRefresh);
    socket.on('notification:delete', triggerNotificationsRefresh);
    socket.on('notification:count', triggerNotificationsRefresh);
    socket.on('chat:message', triggerNotificationsRefresh);
    socket.on('message:new', triggerNotificationsRefresh);
    socket.on('appointment:booked', triggerNotificationsRefresh);
    socket.on('appointment:checked_in', triggerNotificationsRefresh);
    socket.on('appointment:cancelled', triggerNotificationsRefresh);

    return () => {
      socket.disconnect();
    };
  }, [clinicId, isPatient, currentUser?._id, queryClient]);

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
    if (currentUser?.role === ROLES.DOCTOR) return { label: 'Doctor Settings', path: '/doctor/profile' };
    if (currentUser?.role === ROLES.PATIENT) return { label: 'My Profile', path: '/portal?tab=profile' };
    return { label: 'Account Settings', path: '/settings' };
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

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.clearAll();
      queryClient.invalidateQueries({ queryKey: ['user-notifications-unread', clinicId] });
      queryClient.invalidateQueries({ queryKey: ['user-notifications', clinicId] });
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  // Avatar source resolution
  const userAvatarSrc = currentUser?.avatar || currentUser?.profilePhoto || currentUser?.image || currentUser?.clinic?.ownerDetails?.profilePhoto;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-3 sm:px-4 h-16 bg-white/95 border-b border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] backdrop-blur-xl transition-all duration-300">
      
      {/* 1. Left Section: PEHAL Branding & Clinic Selector */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {/* Branding block */}
        <div className="flex items-center gap-2.5 shrink-0">
          <img src={pehalLogo} alt="Pehal" className="h-7 sm:h-8 object-contain shrink-0" />
          <div className="leading-none shrink-0 text-left hidden sm:block">
            <p className="text-[13px] sm:text-[14px] font-black text-slate-900 tracking-tight">AICMS</p>
            <p className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">AI-CMS Enterprise</p>
          </div>
        </div>

        {/* Clinic Info pill card — hidden for Super Admin and on mobile/tablet */}
        {!isPatient && !isSuperAdmin && (
          <div className="relative hidden 2xl:block" ref={branchRef}>
            <button
              onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
              className="flex items-center gap-2 lg:gap-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-150 rounded-full px-2.5 lg:px-3.5 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition duration-200 cursor-pointer active:scale-98 group"
            >
              <span className="text-xs">🏥</span>
              <div className="text-left leading-none">
                <span className="text-[10px] lg:text-[11px] font-black text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors">{clinicName}</span>
                <span className="block text-[8px] text-slate-400 font-bold mt-0.5">Indirapuram Branch</span>
              </div>
              <ChevronDown size={11} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 text-[8px] font-black px-1.5 lg:px-2 py-0.5 rounded-full border border-blue-100/50">
                <span className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
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

      {/* 2. Middle Section: Search Bar */}
      {!isSuperAdmin && (
        <div className="hidden md:flex items-center gap-2 flex-1 max-w-sm lg:max-w-md mx-2 sm:mx-4 relative min-w-0">
          <div className="relative w-full">
            <input
              id="global-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              placeholder="Search patients, appointments..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-8 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition duration-200"
            />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <div className="hidden lg:block absolute right-2.5 top-1/2 -translate-y-1/2 bg-slate-200/60 border border-slate-300/40 rounded px-1 py-0.5 text-[7px] font-black text-slate-500 uppercase tracking-widest pointer-events-none select-none">
              Ctrl+K
            </div>
          </div>
        </div>
      )}

      {/* 3. Right Section: Date, Messages Indicator, Notification Indicator, Profile Dropdown */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        
        {/* Today's Date card */}
        {!isSuperAdmin && (
          <div className="hidden 2xl:flex items-center gap-2.5 bg-slate-50 border border-slate-150 rounded-full px-3.5 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:bg-slate-100/80 transition duration-200 select-none">
            <Calendar size={13} className="text-slate-500" />
            <div className="text-left leading-none">
              <span className="text-[10px] font-black text-slate-800 tracking-tight">{todayStr.formatted}</span>
              <span className="block text-[8px] text-slate-400 font-bold mt-0.5">{todayStr.dayName}</span>
            </div>
          </div>
        )}

        {/* ========================================================
            2. PREMIUM MESSAGE NOTIFICATION BADGE
            ======================================================== */}
        {!isSuperAdmin && (
          <div className="relative">
            <button
              onClick={() => isPatient ? navigate('/portal?tab=support') : navigate('/chat')}
              aria-label="Clinic Messages"
              title="Clinic Messages"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-50 hover:bg-blue-50/70 border border-slate-200/80 hover:border-blue-200 text-slate-600 hover:text-blue-600 transition-all duration-200 active:scale-95 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_2px_8px_rgba(37,99,235,0.12)] flex items-center justify-center cursor-pointer relative"
            >
              <MessageSquare size={17} />
              
              {unreadMessagesCount > 0 && (
                <span 
                  key={unreadMessagesCount}
                  className={`absolute -top-1 -right-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-black text-[10px] leading-none border-2 border-white shadow-[0_2px_6px_rgba(37,99,235,0.35)] flex items-center justify-center animate-in zoom-in-75 duration-200 ${
                    unreadMessagesCount > 9 ? 'px-1.5 h-[18px] min-w-[18px] rounded-full' : 'w-[18px] h-[18px] rounded-full'
                  }`}
                >
                  {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* ========================================================
            3. PREMIUM NOTIFICATION BELL BADGE
            ======================================================== */}
        {!isSuperAdmin && (
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
              aria-label="Notifications"
              title="Notifications"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-50 hover:bg-rose-50/70 border border-slate-200/80 hover:border-rose-200 text-slate-600 hover:text-rose-600 transition-all duration-200 active:scale-95 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_2px_8px_rgba(239,68,68,0.12)] flex items-center justify-center cursor-pointer relative"
            >
              <Bell size={17} className={unreadNotifCount > 0 ? 'animate-[wiggle_1s_ease-in-out_infinite]' : ''} />
              
              {unreadNotifCount > 0 && (
                <span 
                  key={unreadNotifCount}
                  className={`absolute -top-1 -right-1 bg-gradient-to-r from-rose-500 to-red-600 text-white font-black text-[10px] leading-none border-2 border-white shadow-[0_2px_6px_rgba(239,68,68,0.35)] flex items-center justify-center animate-in zoom-in-75 duration-200 ${
                    unreadNotifCount > 9 ? 'px-1.5 h-[18px] min-w-[18px] rounded-full' : 'w-[18px] h-[18px] rounded-full'
                  }`}
                >
                  {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {notificationDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-white border border-slate-200 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-black text-slate-800">Notifications</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                      {unreadNotifCount} Unread
                    </span>
                    {unreadNotifCount > 0 && (
                      <button 
                        onClick={handleMarkAllRead}
                        className="text-[10px] font-bold text-slate-500 hover:text-blue-600 underline"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-50 mt-2">
                  {rawNotifications.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2">
                        <Bell size={18} />
                      </div>
                      <p className="text-xs font-bold text-slate-700">No new notifications</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">You're completely up to date!</p>
                    </div>
                  ) : (
                    rawNotifications.map(item => (
                      <div 
                        key={item._id} 
                        className={`py-2.5 px-2 flex items-start gap-2.5 rounded-xl transition ${!item.isRead ? 'bg-blue-50/40 hover:bg-blue-50/70' : 'hover:bg-slate-50'}`}
                      >
                        <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-blue-500" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-black text-slate-800 leading-snug">{item.title || item.subject || 'Notification'}</p>
                          <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-snug">{item.message || item.body || item.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            1. PREMIUM HEADER PROFILE SECTION & AVATAR
            ======================================================== */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            aria-label="User Profile Menu"
            className="flex items-center gap-2 sm:gap-2.5 bg-white sm:bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200/80 hover:border-slate-300 rounded-full pl-1.5 pr-2.5 sm:pr-3.5 py-1 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_2px_8px_rgba(79,70,229,0.08)] transition-all duration-200 cursor-pointer active:scale-[0.98] group"
          >
            {isSuperAdmin ? (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shrink-0 shadow-sm">
                <Shield size={14} className="text-white" />
              </div>
            ) : (
              <Avatar
                src={userAvatarSrc}
                name={ownerName}
                size="w-8 h-8 sm:w-8.5 sm:h-8.5"
                gradientBorder={true}
                showOnline={true}
                className="shrink-0"
              />
            )}

            <div className="text-left leading-none">
              <p className="text-[11px] sm:text-[12px] font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors leading-none">
                {isSuperAdmin ? 'Super Admin' : `${ownerName}!`}
              </p>
              <span className="block text-[8px] sm:text-[9px] text-slate-400 font-semibold leading-tight mt-0.5">
                {roleLabel}
              </span>
            </div>

            <ChevronDown 
              size={12} 
              className={`text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${
                profileDropdownOpen ? 'rotate-180' : ''
              }`} 
            />
          </button>

          {/* Profile Dropdown Menu */}
          {profileDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-2xl bg-white border border-slate-200/80 shadow-[0_10px_35px_rgba(0,0,0,0.12)] p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              
              {/* Profile Card Summary Header */}
              <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center gap-3 mb-1.5">
                <Avatar
                  src={userAvatarSrc}
                  name={ownerName}
                  size="w-10 h-10 text-sm"
                  gradientBorder={true}
                  showOnline={true}
                  className="shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-900 truncate leading-none">{ownerName}</p>
                  <p className="text-[9px] text-slate-400 font-bold truncate mt-1 leading-none">{currentUser?.email || 'user@pehal.com'}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[8px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100/60 leading-none">
                      {roleLabel}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[8px] font-bold text-emerald-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Online
                    </span>
                  </div>
                </div>
              </div>

              {/* Menu Actions */}
              <div className="space-y-0.5">
                {/* 1. View Profile */}
                <button
                  type="button"
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    setViewProfileOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded-xl transition text-left cursor-pointer"
                >
                  <User size={14} className="text-slate-400" />
                  <span>View Profile</span>
                </button>

                {/* 2. Edit Profile */}
                <button
                  type="button"
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    setEditProfileOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded-xl transition text-left cursor-pointer"
                >
                  <Edit3 size={14} className="text-slate-400" />
                  <span>Edit Profile</span>
                </button>

                {/* 3. Account Settings */}
                {settingsLink && (
                  <Link
                    to={settingsLink.path}
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded-xl transition cursor-pointer"
                  >
                    <Settings size={14} className="text-slate-400" />
                    <span>{settingsLink.label}</span>
                  </Link>
                )}

                {/* 4. Change Password */}
                <button
                  type="button"
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    setChangePasswordOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition text-left cursor-pointer"
                >
                  <KeyRound size={14} className="text-slate-400" />
                  <span>Change Password</span>
                </button>

                <div className="border-t border-slate-100 my-1" />

                {/* 5. Logout */}
                <button
                  type="button"
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    handleLogoutClick();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition text-left cursor-pointer"
                >
                  <LogOut size={14} className="text-rose-500" />
                  <span>Logout</span>
                </button>
              </div>

            </div>
          )}
        </div>

      </div>

      {/* ========================================================
          MODALS: VIEW PROFILE, EDIT PROFILE, CHANGE PASSWORD
          ======================================================== */}
      <ViewProfileModal
        isOpen={viewProfileOpen}
        onClose={() => setViewProfileOpen(false)}
        user={currentUser}
        onOpenEdit={() => setEditProfileOpen(true)}
        onOpenChangePassword={() => setChangePasswordOpen(true)}
      />

      <EditProfileModal
        isOpen={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        user={currentUser}
        onUserUpdated={(updatedUser) => {
          queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
          // If storage holds storedUser, update it
          try {
            const raw = localStorage.getItem('ai_cms_user');
            if (raw) {
              const current = JSON.parse(raw);
              localStorage.setItem('ai_cms_user', JSON.stringify({ ...current, ...updatedUser }));
            }
          } catch (_) {}
          window.dispatchEvent(new Event('storage'));
        }}
      />

      <ChangePasswordModal
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        userEmail={currentUser?.email}
      />

    </header>
  );
};

export default Topbar;
