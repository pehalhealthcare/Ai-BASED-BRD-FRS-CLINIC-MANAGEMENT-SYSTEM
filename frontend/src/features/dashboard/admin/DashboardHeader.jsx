import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, MessageSquare, User, Settings, LogOut, Calendar, Search, 
  X, Info, Briefcase, Trash2, Archive, CheckCircle2, RotateCw
} from 'lucide-react';
import { clinicApi, notificationApi, chatApi } from '../../../lib/api';
import Avatar from '../../../components/ui/Avatar';

const GREETING_ICONS = { morning: '🌅', afternoon: '☀️', evening: '🌙', night: '🌙' };

const getGreetingPart = () => {
  const hour = new Date().getHours();
  if (hour < 12) return { label: 'GOOD MORNING', icon: GREETING_ICONS.morning };
  if (hour < 17) return { label: 'GOOD AFTERNOON', icon: GREETING_ICONS.afternoon };
  if (hour < 21) return { label: 'GOOD EVENING', icon: GREETING_ICONS.evening };
  return { label: 'GOOD NIGHT', icon: GREETING_ICONS.night };
};

const DashboardHeader = ({ user, selectedDate, onDateChange }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clinicId = user?.clinicId || user?.clinic?._id;

  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [expandedNotifications, setExpandedNotifications] = useState({});

  const { label, icon } = getGreetingPart();
  const clinicName = user?.clinic?.name || "Ram's Dental Clinic";

  // Socket IO Sync
  useEffect(() => {
    if (!clinicId) return;
    const token = localStorage.getItem('ai_cms_access_token') || localStorage.getItem('token');
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      auth: { token }
    });

    socket.on('connect', () => {
      socket.emit('join_clinic', clinicId);
    });

    const refreshNotifications = () => {
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['user-notifications-unread'] });
      queryClient.invalidateQueries({ queryKey: ['conversations', user?._id] });
    };

    socket.on('notification:new', refreshNotifications);
    socket.on('notification:update', refreshNotifications);
    socket.on('notification:read', refreshNotifications);
    socket.on('notification:delete', refreshNotifications);
    socket.on('notification:count', refreshNotifications);

    return () => {
      socket.disconnect();
    };
  }, [clinicId, user?._id, queryClient]);

  // Query unread chats
  const { data: conversationsRes } = useQuery({
    queryKey: ['conversations', user?._id],
    queryFn: () => chatApi.getConversations(),
    enabled: !!user
  });
  
  const conversations = useMemo(() => {
    return conversationsRes?.conversations || conversationsRes?.data?.conversations || [];
  }, [conversationsRes]);

  const unreadMessagesCount = useMemo(() => {
    return conversations.reduce((acc, c) => {
      const count = typeof c.unreadCount === 'number' 
        ? c.unreadCount 
        : (user?.role === 'RECEPTIONIST' ? c.unreadCount?.receptionist : c.unreadCount?.doctor) || 0;
      return acc + count;
    }, 0);
  }, [conversations, user?.role]);

  // Infinite query for in-app UserNotifications
  const {
    data: infiniteNotificationsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['user-notifications', clinicId],
    queryFn: ({ pageParam = 1 }) => notificationApi.listUserNotifications({ page: pageParam, limit: 5 }),
    getNextPageParam: (lastPage) => {
      const data = lastPage?.data || lastPage;
      return data?.hasMore ? (data?.page || 1) + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!clinicId
  });

  const allNotifications = useMemo(() => {
    return (infiniteNotificationsData?.pages?.flatMap(page => page?.data?.items || page?.items || []) || []).filter(Boolean);
  }, [infiniteNotificationsData]);

  // Get real-time unread count
  const { data: unreadCountRes } = useQuery({
    queryKey: ['user-notifications-unread', clinicId],
    queryFn: () => notificationApi.getUnreadCount(),
    enabled: !!clinicId
  });
  const unreadNotifCount = unreadCountRes?.data?.count ?? unreadCountRes?.count ?? 0;

  const handleLogoutClick = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('ai_cms_access_token');
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to delete all notifications?')) {
      try {
        await notificationApi.clearAll();
        queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
        queryClient.invalidateQueries({ queryKey: ['user-notifications-unread'] });
      } catch (err) {
        console.error('Failed to clear notifications:', err);
      }
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['user-notifications-unread'] });
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleArchive = async (id) => {
    try {
      await notificationApi.archive(id);
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['user-notifications-unread'] });
    } catch (err) {
      console.error('Failed to archive:', err);
    }
  };

  const formattedDate = useMemo(() => {
    const d = new Date(selectedDate);
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} - ${month} - ${year}`;
  }, [selectedDate]);

  const toggleExpand = (id) => {
    setExpandedNotifications(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Keyboard accessibility listeners (ESC to close)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setProfileOpen(false);
        setNotifOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Icon type mapping
  const getTypeStyles = (type) => {
    switch (type) {
      case 'appointment':
        return { iconBg: 'bg-blue-50 text-blue-600', dotBg: 'bg-blue-500' };
      case 'billing':
        return { iconBg: 'bg-emerald-50 text-emerald-600', dotBg: 'bg-emerald-500' };
      case 'alert':
        return { iconBg: 'bg-rose-50 text-rose-600', dotBg: 'bg-rose-500' };
      case 'lab':
        return { iconBg: 'bg-purple-50 text-purple-600', dotBg: 'bg-purple-500' };
      case 'inventory':
        return { iconBg: 'bg-amber-50 text-amber-600', dotBg: 'bg-amber-500' };
      case 'provider':
        return { iconBg: 'bg-emerald-50 text-emerald-600', dotBg: 'bg-emerald-500' };
      case 'ai_insight':
        return { iconBg: 'bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-indigo-500 text-indigo-600', dotBg: 'bg-indigo-500' };
      default:
        return { iconBg: 'bg-slate-50 text-slate-600', dotBg: 'bg-slate-500' };
    }
  };

  return (
    <div className="space-y-4 w-full">
      {/* ========================================================
          DESKTOP HEADER VIEW
          ======================================================== */}
      <div className="hidden xl:flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            {label}, {user?.name || 'Admin'}! <span>{icon}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Here's what's happening in your clinic today.</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2" />
              <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" strokeLinecap="round" />
              <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" strokeLinecap="round" />
              <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" />
            </svg>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="text-xs font-bold text-slate-700 outline-none bg-transparent cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* ========================================================
          MOBILE/TABLET HEADER VIEW (Hidden on Large Desktop)
          ======================================================== */}
      <div className="xl:hidden flex flex-col gap-4">
        
        {/* Section 2 — Clinic Information Bar */}
        <div className="bg-white border border-slate-150 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-sm relative">
          {/* Clinic Identity */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-[42px] h-[42px] rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              <Briefcase size={16} className="text-slate-500" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[13px] sm:text-[15px] font-black text-slate-955 uppercase tracking-tight truncate leading-none">
                {clinicName.toUpperCase()}
              </h2>
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold block mt-1.5">
                Indirapuram Branch
              </span>
            </div>
          </div>

          {/* Action Icons + Profile */}
          <div className="flex items-center gap-3">
            {/* Chat Icon */}
            <button 
              onClick={() => navigate('/chat')}
              className="p-1 text-slate-655 relative hover:bg-slate-50 rounded-lg transition"
            >
              <MessageSquare size={20} />
              {unreadMessagesCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[8px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center">
                  {unreadMessagesCount}
                </span>
              )}
            </button>

            {/* Bell Icon with Premium Badge */}
            <button 
              onClick={() => setNotifOpen(true)}
              className="p-1 text-slate-655 relative hover:bg-slate-50 rounded-lg transition"
            >
              <Bell size={20} />
              {unreadNotifCount > 0 && (
                <AnimatePresence mode="wait">
                  <motion.span 
                    key={unreadNotifCount}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: [0.8, 1.2, 1] }}
                    className={`absolute -top-1.5 -right-1.5 bg-[#EF4444] text-white text-[9px] font-bold border-2 border-white shadow-sm flex items-center justify-center ${
                      unreadNotifCount > 9 ? 'px-1.5 h-[17px] rounded-full' : 'w-[17px] h-[17px] rounded-full'
                    }`}
                  >
                    {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                  </motion.span>
                </AnimatePresence>
              )}
            </button>

            {/* Admin Profile */}
            <button 
              onClick={() => setProfileOpen(true)}
              className="flex items-center gap-2 text-left focus:outline-none ml-1 shrink-0"
            >
              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-650 font-black text-xs flex items-center justify-center overflow-hidden border border-slate-150">
                {user?.name?.slice(0, 2).toUpperCase() || 'AD'}
              </div>
              <div className="hidden sm:block leading-none">
                <p className="text-[11px] font-black text-slate-900 leading-none">{user?.name || 'King!'}</p>
                <span className="text-[9px] text-slate-400 block mt-1">Clinic Admin</span>
                <span className="text-[9px] text-emerald-600 font-bold block mt-0.5">🟢 online</span>
              </div>
            </button>
          </div>

          {/* ========================================================
              CLINIC ADMIN PROFILE POPOVER
              ======================================================== */}
          <AnimatePresence>
            {profileOpen && (
              <>
                <div 
                  className="fixed inset-0 z-45" 
                  onClick={() => setProfileOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-4 top-16 w-64 bg-white border border-slate-150 rounded-[24px] shadow-2xl z-50 p-5 flex flex-col gap-4"
                >
                  <div className="flex items-start gap-3">
                    <Avatar 
                      src={user?.avatar} 
                      name={user?.name || 'Admin'} 
                      size="w-12 h-12 rounded-full border border-slate-150 shrink-0" 
                    />
                    <div className="min-w-0 leading-tight">
                      <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                        {user?.name || 'King!'}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">Clinic Admin</p>
                      <span className="text-[10px] text-emerald-600 font-bold mt-1 inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> online
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 font-semibold break-all border-b border-slate-100 pb-3">
                    {user?.email || 'owner@test.com'}
                  </div>

                  <button 
                    onClick={() => { navigate('/clinic/settings'); setProfileOpen(false); }}
                    className="w-full py-3 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 font-black text-xs rounded-2xl transition duration-150 uppercase flex items-center justify-center gap-2"
                  >
                    <Settings size={14} /> Clinic Settings
                  </button>

                  <button 
                    onClick={() => { handleLogoutClick(); setProfileOpen(false); }}
                    className="w-full py-3 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 font-black text-xs rounded-2xl transition duration-150 uppercase flex items-center justify-center gap-2"
                  >
                    <LogOut size={14} /> Logout
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Section 3 — Greeting + Date Banner */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <span className="text-[15px] font-black text-slate-955 tracking-tight">
            {label} {icon}
          </span>
          
          <div className="flex items-center gap-2 text-xs font-black text-slate-900">
            <span className="tracking-tight">{formattedDate}</span>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <Calendar size={15} className="text-slate-900" />
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================
          MOBILE/TABLET SEARCH SHEET
          ======================================================== */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white z-50 p-6 flex flex-col gap-6"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-xs font-black text-slate-900 uppercase">Search AI-CMS</h3>
              <button onClick={() => setSearchOpen(false)} className="p-1.5 rounded-xl hover:bg-slate-50 text-slate-550">
                <X size={18} />
              </button>
            </div>

            <div className="relative">
              <input 
                type="text" 
                placeholder="Search Patients, Doctors, Appointments, Invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 transition"
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================
          MOBILE/TABLET REDESIGNED NOTIFICATIONS DRAWER POPOVER
          ======================================================== */}
      <AnimatePresence>
        {notifOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.45 }}
              exit={{ opacity: 0 }}
              onClick={() => setNotifOpen(false)}
              className="fixed inset-0 bg-black z-50 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed right-4 top-4 bottom-4 w-[88vw] sm:w-[90vw] md:w-[440px] max-w-[480px] h-[calc(100vh-32px)] bg-white shadow-2xl z-50 p-6 flex flex-col gap-6 select-none border border-slate-100 rounded-[24px]"
            >
              {/* Sticky Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 bg-white sticky top-0 z-10">
                <h3 className="text-[18px] font-black text-slate-900 uppercase tracking-tight">Notifications</h3>
                <button 
                  onClick={() => setNotifOpen(false)} 
                  className="p-1.5 rounded-xl hover:bg-slate-50 text-slate-500 transition active:scale-95"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Sticky Clear All Button */}
              <div className="shrink-0 bg-white z-10">
                <button
                  onClick={handleClearAll}
                  className="w-full h-12 border border-slate-250 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl text-xs font-black text-slate-800 flex items-center justify-center gap-2 uppercase tracking-wider transition duration-150 active:scale-98"
                >
                  <Trash2 size={14} /> Clear All Notifications
                </button>
              </div>

              {/* Scrollable List */}
              <div 
                className="flex-1 overflow-y-auto space-y-4 pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                onScroll={(e) => {
                  const target = e.target;
                  if (target.scrollHeight - target.scrollTop === target.clientHeight) {
                    if (hasNextPage && !isFetchingNextPage) {
                      fetchNextPage();
                    }
                  }
                }}
              >
                {allNotifications.length === 0 ? (
                  <div className="py-16 flex flex-col items-center justify-center text-center gap-4">
                    <div className="w-16 h-16 bg-slate-50 text-slate-350 border border-slate-100 rounded-3xl flex items-center justify-center shadow-sm">
                      <Bell size={24} className="opacity-40 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-800">No Notifications</h4>
                      <p className="text-xs text-slate-400 font-bold mt-1.5">Everything is up to date.</p>
                    </div>
                    <button 
                      onClick={() => queryClient.invalidateQueries({ queryKey: ['user-notifications'] })}
                      className="px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 border border-slate-200 mt-2 flex items-center gap-1.5 transition"
                    >
                      <RotateCw size={13} /> Refresh
                    </button>
                  </div>
                ) : (
                  allNotifications.map(log => {
                    const isExpanded = expandedNotifications[log._id];
                    const styles = getTypeStyles(log.type);

                    return (
                      <div key={log._id} className="relative overflow-hidden rounded-[20px] border border-slate-150 min-h-[110px] flex flex-col">
                        {/* Drag / Slide to Archive Box behind */}
                        <div className="absolute inset-y-0 left-0 w-20 bg-rose-50/80 flex flex-col items-center justify-center text-rose-500 z-0">
                          <Archive size={16} />
                          <span className="text-[9px] font-bold mt-1">Archive</span>
                        </div>

                        {/* Swipeable Container */}
                        <motion.div
                          drag="x"
                          dragConstraints={{ left: 0, right: 80 }}
                          onDragEnd={(event, info) => {
                            if (info.offset.x > 60) {
                              handleArchive(log._id);
                            }
                          }}
                          className="bg-white p-4 flex items-start gap-3.5 z-10 flex-1"
                        >
                          {/* Left Icon */}
                          <div className={`w-[42px] h-[42px] rounded-xl flex items-center justify-center shrink-0 shadow-xs ${styles.iconBg}`}>
                            {log.type === 'appointment' ? <Calendar size={18} /> : <Info size={18} />}
                          </div>

                          {/* Center Content */}
                          <div className="flex-1 min-w-0 text-left">
                            <div className="flex items-center justify-between gap-1.5">
                              <h4 className="text-[14px] font-black text-slate-900 truncate leading-none">
                                {log.title}
                              </h4>
                              {/* Unread indicator dot */}
                              <span className={`w-2 h-2 rounded-full shrink-0 ${log.isRead ? 'bg-slate-300' : 'bg-blue-500 animate-pulse'}`} />
                            </div>
                            
                            <p className="text-[12px] text-slate-500 font-medium mt-1.5 leading-relaxed">
                              {log.message}
                            </p>
                            
                            <span className="text-[10px] text-slate-400 font-bold block mt-2">
                              {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>

                            {/* Actionable wrapper */}
                            {log.actionable && (
                              <div className="mt-3.5 bg-emerald-50/60 border border-emerald-150 rounded-2xl p-4 space-y-3">
                                <span className="text-[9px] font-black text-emerald-800 uppercase block tracking-wider">Action Required</span>
                                <p className="text-[12px] text-slate-700 font-medium leading-relaxed">
                                  {log.message}
                                </p>
                                <div className="flex items-center gap-3 w-full">
                                  <button 
                                    onClick={() => handleMarkRead(log._id)}
                                    className="flex-1 py-2 bg-white hover:bg-slate-50 text-slate-800 text-[11px] font-black uppercase rounded-lg border border-slate-200 transition text-center"
                                  >
                                    Acknowledge
                                  </button>
                                  {log.actionTask && (
                                    <button 
                                      onClick={() => { navigate(log.actionTask); setNotifOpen(false); }}
                                      className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-black uppercase rounded-lg shadow-sm border border-emerald-450 transition text-center"
                                    >
                                      Go to Task
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Read More details */}
                            {isExpanded && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mt-2.5 text-[10px] text-slate-500 font-bold border-t border-slate-100 pt-2.5 leading-relaxed"
                              >
                                Type: {log.type.toUpperCase()}<br/>
                                Timestamp: {new Date(log.createdAt).toLocaleString()}
                              </motion.div>
                            )}

                            {/* Read More button (only show when not actionable to avoid cluttering) */}
                            {!log.actionable && (
                              <div className="flex items-center justify-between mt-3 border-t border-slate-50 pt-2 shrink-0">
                                <button 
                                  onClick={() => toggleExpand(log._id)}
                                  className="text-[9px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition"
                                >
                                  {isExpanded ? 'Read Less' : 'Read More...'}
                                </button>

                                {!log.isRead && (
                                  <button 
                                    onClick={() => handleMarkRead(log._id)}
                                    className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-800 text-[11px] font-black uppercase rounded-lg border border-slate-200 transition"
                                  >
                                    Acknowledge
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      </div>
                    );
                  })
                )}

                {isFetchingNextPage && (
                  <p className="text-[10px] text-slate-400 font-bold text-center py-4 animate-pulse">Loading more...</p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};

export default DashboardHeader;
