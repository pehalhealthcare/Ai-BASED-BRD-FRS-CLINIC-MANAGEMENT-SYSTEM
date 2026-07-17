import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Search, Filter, CheckSquare, Settings as SettingsIcon,
  Calendar, User, CreditCard, FlaskConical, Pill, UserCheck, CheckCircle2,
  AlertCircle, XCircle, Clock, Trash2, ArrowUpRight, ShieldAlert, Laptop
} from 'lucide-react';
import { listNotificationLogs, cancelNotificationLog } from './notificationsApi';
import { apiClient } from '../../lib/api';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import PageHeader from '../../components/layout/PageHeader';
import useAuth from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const NOTIFICATION_CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'appointment', label: 'Appointments' },
  { key: 'patient', label: 'Patients' },
  { key: 'payment', label: 'Payments' },
  { key: 'laboratory', label: 'Lab' },
  { key: 'pharmacy', label: 'Pharmacy' },
  { key: 'feature_requests', label: 'Feature Requests' },
  { key: 'system', label: 'System' }
];

const NOTIFICATION_ICONS = {
  appointment: { icon: Calendar, color: '#6366f1', bg: '#eef2ff' },
  patient:     { icon: User, color: '#10b981', bg: '#ecfdf5' },
  payment:     { icon: CreditCard, color: '#f59e0b', bg: '#fffbeb' },
  laboratory:  { icon: FlaskConical, color: '#0ea5e9', bg: '#f0f9ff' },
  pharmacy:    { icon: Pill, color: '#ec4899', bg: '#fdf2f8' },
  staff:       { icon: UserCheck, color: '#ef4444', bg: '#fef2f2' },
  system:      { icon: Laptop, color: '#3b82f6', bg: '#eff6ff' }
};

const NotificationsAdminPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [logs, setLogs] = useState([]);
  const [featureRequests, setFeatureRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await listNotificationLogs({ limit: 100 });
      setLogs(response?.data?.notificationLogs || response?.notificationLogs || []);
      
      const resReq = await apiClient.get('/clinics/features/requests');
      setFeatureRequests(resReq.data?.requests || resReq.requests || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to fetch notification logs.');
    } finally {
      setLoading(false);
    }
  };

  const loadFeatureRequests = async () => {
    try {
      const resReq = await apiClient.get('/clinics/features/requests');
      setFeatureRequests(resReq.data?.requests || resReq.requests || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  // Compute counts for tabs and sidebar
  const counts = useMemo(() => {
    const res = { all: 0, appointment: 0, patient: 0, payment: 0, laboratory: 0, pharmacy: 0, system: 0, staff: 0, unread: 0, feature_requests: featureRequests.filter(r => r.status === 'pending').length };
    logs.forEach(log => {
      res.all++;
      const cat = log.type?.toLowerCase() || 'system';
      if (res[cat] !== undefined) {
        res[cat]++;
      } else {
        res.system++;
      }
      if (log.status === 'pending' || log.status === 'sent') {
        res.unread++; // Simulated unread count
      }
    });
    return res;
  }, [logs, featureRequests]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    let result = [...logs];
    if (activeTab !== 'all') {
      result = result.filter(log => {
        const cat = log.type?.toLowerCase() || 'system';
        return cat === activeTab;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(log =>
        log.title?.toLowerCase().includes(q) ||
        log.message?.toLowerCase().includes(q) ||
        log.patientId?.name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [logs, activeTab, searchQuery]);

  if (loading) return <LoadingState label="Loading notifications..." />;
  if (error) return <ErrorState title="Unable to load notifications" description={error} />;

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <PageHeader
          eyebrow="Admin Panel"
          title="Notifications"
          description="Stay updated with important alerts and activities in your clinic."
        />
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <button
            onClick={() => alert('All notifications marked as read')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-sm"
          >
            <CheckSquare size={14} className="text-slate-500" />
            Mark all as read
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-sm"
          >
            <SettingsIcon size={14} className="text-slate-500" />
            Notification Settings
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-100">
        {NOTIFICATION_CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveTab(cat.key)}
            className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap transition cursor-pointer border-b-2 -mb-px ${
              activeTab === cat.key
                ? 'text-blue-600 border-blue-600'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            {cat.label} ({counts[cat.key] || 0})
          </button>
        ))}
      </div>

      <div className="flex gap-5 items-start">
        {/* Main List */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition text-slate-800"
              />
            </div>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer">
              <Filter size={13} /> Filter
            </button>
          </div>

          {/* List Items */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50 overflow-hidden">
            {activeTab === 'feature_requests' ? (
              featureRequests.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">No active premium feature upgrade requests.</div>
              ) : (
                featureRequests.map(req => (
                  <div key={req._id} className="p-5 hover:bg-slate-50/50 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                        <Bell size={18} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-slate-800">
                          {req.doctorName} requested <span className="text-violet-600 font-bold">{req.featureName}</span>
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Requested: {new Date(req.requestedOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <div className="flex items-center gap-3 pt-1">
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            Current Plan: <strong>{req.currentPlan}</strong>
                          </span>
                          <span className="text-[10px] bg-violet-50 text-violet-600 px-2 py-0.5 rounded">
                            Recommended: <strong>{req.recommendedPlan}</strong>
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-black ${
                            req.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => navigate('/admin/subscription')}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-bold transition shadow-sm cursor-pointer"
                      >
                        Upgrade Plan
                      </button>
                      {req.status === 'pending' && (
                        <button
                          onClick={async () => {
                            try {
                              await apiClient.patch(`/clinics/features/requests/${req._id}/dismiss`);
                              toast.success('Request dismissed');
                              loadFeatureRequests();
                            } catch (e) {
                              toast.error('Failed to dismiss request');
                            }
                          }}
                          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-bold transition cursor-pointer"
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )
            ) : (
              filteredLogs.map(log => {
                const cat = log.type?.toLowerCase() || 'system';
                const cfg = NOTIFICATION_ICONS[cat] || NOTIFICATION_ICONS.system;
                const Icon = cfg.icon;
                const isUnread = log.status === 'sent' || log.status === 'pending';

                return (
                  <div key={log._id} className="p-4 hover:bg-slate-50/50 transition flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
                      <Icon size={18} style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-900 leading-tight">
                          {log.title || `${cat.charAt(0).toUpperCase() + cat.slice(1)} Alert`}
                        </p>
                        {isUnread && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-wider">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{log.message}</p>
                      <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-md mt-2 bg-slate-50 text-slate-500 uppercase tracking-wider border border-slate-100">
                        {cat}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {activeTab !== 'feature_requests' && filteredLogs.length === 0 && (
              <div className="p-16 text-center text-slate-400">
                <Bell size={36} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm font-semibold">No notifications found</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Summary */}
        <div className="w-72 shrink-0 space-y-4 hidden xl:block">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-slate-800">Notification Summary</p>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">This Month</span>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Total Notifications', val: counts.all, color: '#6366f1' },
                { label: 'Unread Notifications', val: counts.unread, color: '#3b82f6', isBlue: true },
                { label: 'Appointments', val: counts.appointment, color: '#10b981' },
                { label: 'Patients', val: counts.patient, color: '#f59e0b' },
                { label: 'Payments', val: counts.payment, color: '#0ea5e9' },
                { label: 'Laboratory', val: counts.laboratory, color: '#ec4899' },
                { label: 'Pharmacy', val: counts.pharmacy, color: '#ef4444' },
                { label: 'System', val: counts.system, color: '#94a3b8' },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: row.color }} />
                    <span className="text-slate-600 font-medium">{row.label}</span>
                  </div>
                  <span className={`font-extrabold ${row.isBlue ? 'text-blue-600' : 'text-slate-700'}`}>{row.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activities List */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <p className="text-sm font-bold text-slate-800 mb-4">Recent Activities</p>
            <div className="space-y-3">
              {filteredLogs.slice(0, 4).map(log => {
                const cat = log.type?.toLowerCase() || 'system';
                const cfg = NOTIFICATION_ICONS[cat] || NOTIFICATION_ICONS.system;
                const Icon = cfg.icon;
                return (
                  <div key={log._id} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
                      <Icon size={12} style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">{log.title || 'Notification'}</p>
                      <p className="text-[9px] text-slate-400">
                        {new Date(log.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-blue-600 rounded-2xl p-5 text-white">
            <p className="text-sm font-bold">Stay Updated</p>
            <p className="text-[11px] text-indigo-100 mt-1 leading-relaxed">
              Enable email and SMS notifications to never miss important updates.
            </p>
            <button className="mt-4 w-full py-2.5 rounded-xl bg-white text-indigo-600 text-xs font-bold hover:bg-indigo-50 transition cursor-pointer">
              Manage Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsAdminPage;
