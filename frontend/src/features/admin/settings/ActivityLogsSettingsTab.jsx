import { useState, useEffect, useCallback } from 'react';
import {
  Search, Download, Calendar, MoreVertical, Edit2, Plus,
  LogIn, Trash2, Shield, RefreshCw, Loader2, ChevronLeft, ChevronRight
} from 'lucide-react';
import { auditApi, userApi } from '../../../lib/api';
import LogDetailDrawer from './LogDetailDrawer';

const ACTION_CONFIGS = {
  Updated: {
    icon: Edit2,
    badgeClass: 'bg-blue-50 text-blue-600 border-blue-200/60'
  },
  Created: {
    icon: Plus,
    badgeClass: 'bg-emerald-50 text-emerald-600 border-emerald-200/60'
  },
  Login: {
    icon: LogIn,
    badgeClass: 'bg-purple-50 text-purple-600 border-purple-200/60'
  },
  Deleted: {
    icon: Trash2,
    badgeClass: 'bg-rose-50 text-rose-600 border-rose-200/60'
  }
};

const USER_COLORS = [
  'bg-purple-100 text-purple-700',
  'bg-sky-100 text-sky-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-rose-100 text-rose-700',
  'bg-indigo-100 text-indigo-700'
];

const ActivityLogsSettingsTab = ({ clinicId }) => {
  const [logs, setLogs] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState('All Users');
  const [selectedModule, setSelectedModule] = useState('All Modules');
  const [selectedAction, setSelectedAction] = useState('All Actions');
  const [page, setPage] = useState(1);
  const [limit] = useState(5);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Detail drawer
  const [selectedLog, setSelectedLog] = useState(null);

  // Fetch users for dropdown
  useEffect(() => {
    let isMounted = true;
    const fetchUsers = async () => {
      try {
        const res = await userApi.list({ clinicId });
        const users = res.data?.users || res.users || [];
        if (isMounted) setUsersList(users);
      } catch (err) {
        console.warn('Failed to load clinic users for filter:', err);
      }
    };
    fetchUsers();
    return () => { isMounted = false; };
  }, [clinicId]);

  // Fetch audit logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        limit,
        clinicId: clinicId || undefined
      };

      if (search.trim()) params.search = search.trim();
      if (selectedAction !== 'All Actions') params.action = selectedAction;
      if (selectedModule !== 'All Modules') params.module = selectedModule;
      if (selectedUser !== 'All Users') params.actorUserId = selectedUser;

      const res = await auditApi.listLogs(params);
      const data = res.data || res || {};

      setLogs(data.logs || []);
      setTotal(data.total || (data.logs ? data.logs.length : 0));
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setError('Failed to retrieve activity logs. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [clinicId, page, limit, search, selectedAction, selectedModule, selectedUser]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = {
        clinicId: clinicId || undefined,
        action: selectedAction !== 'All Actions' ? selectedAction : undefined,
        module: selectedModule !== 'All Modules' ? selectedModule : undefined,
        actorUserId: selectedUser !== 'All Users' ? selectedUser : undefined,
        search: search.trim() || undefined
      };

      const res = await auditApi.exportLogs(params);
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `activity_logs_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export logs failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Nov 06, 2026, 11:24 AM';
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getUserColor = (initials = '') => {
    let hash = 0;
    for (let i = 0; i < initials.length; i++) {
      hash = initials.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % USER_COLORS.length;
    return USER_COLORS[idx];
  };

  const renderPaginationButtons = () => {
    const buttons = [];
    const maxVisible = 5;
    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          type="button"
          onClick={() => setPage(i)}
          className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center ${
            page === i
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {i}
        </button>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        buttons.push(<span key="dots" className="text-slate-400 text-xs px-1">...</span>);
      }
      buttons.push(
        <button
          key={totalPages}
          type="button"
          onClick={() => setPage(totalPages)}
          className="w-7 h-7 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer flex items-center justify-center"
        >
          {totalPages}
        </button>
      );
    }

    return buttons;
  };

  const startRecord = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);

  return (
    <div className="space-y-5">
      {/* Header & Subtitle */}
      <div className="space-y-1">
        <h3 className="text-base font-bold text-slate-800">Activity Logs</h3>
        <p className="text-xs text-slate-400">
          Track and monitor important actions performed in your clinic account.
        </p>
      </div>

      {/* Main Container Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Filters & Actions Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Search Input */}
            <div className="relative min-w-[220px] max-w-xs flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by user, action or module..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 bg-white"
              />
            </div>

            {/* Users Filter */}
            <select
              value={selectedUser}
              onChange={(e) => {
                setSelectedUser(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="All Users">All Users</option>
              {usersList.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name}
                </option>
              ))}
            </select>

            {/* Modules Filter */}
            <select
              value={selectedModule}
              onChange={(e) => {
                setSelectedModule(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="All Modules">All Modules</option>
              <option value="Patients">Patients</option>
              <option value="Appointments">Appointments</option>
              <option value="Authentication">Authentication</option>
              <option value="Billing">Billing</option>
              <option value="Settings">Settings</option>
              <option value="Backup & Data">Backup & Data</option>
              <option value="Integrations">Integrations</option>
            </select>

            {/* Actions Filter */}
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="All Actions">All Actions</option>
              <option value="Created">Created</option>
              <option value="Updated">Updated</option>
              <option value="Login">Login</option>
              <option value="Deleted">Deleted</option>
            </select>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Date Range Pill */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-xs font-medium">
              <Calendar size={13} className="text-slate-400" />
              <span>Nov 01, 2026 - Nov 06, 2026</span>
            </div>

            {/* Export Logs Button */}
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="px-4 py-2 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-md shadow-blue-200 hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              <span>Export Logs</span>
            </button>
          </div>
        </div>

        {/* Table Area */}
        <div className="overflow-x-auto min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-2">
              <Loader2 size={24} className="animate-spin text-blue-600" />
              <p className="text-xs font-medium">Loading audit trail...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-xs text-rose-600 font-semibold">
              {error}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs space-y-2">
              <Shield size={24} className="mx-auto text-slate-300" />
              <p className="font-semibold text-slate-600">No activity logs found</p>
              <p className="text-slate-400 text-[11px]">Actions performed by clinic users will be logged here automatically.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/40">
                  <th className="py-3.5 px-5">Date & Time</th>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Module</th>
                  <th className="py-3.5 px-4">Details</th>
                  <th className="py-3.5 px-4">IP Address</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs text-slate-700">
                {logs.map((log) => {
                  const actionCfg = ACTION_CONFIGS[log.action] || ACTION_CONFIGS.Updated;
                  const ActionIcon = actionCfg.icon;
                  const initials = log.user?.initials || 'SA';
                  const avatarColor = getUserColor(initials);

                  return (
                    <tr key={log._id} className="hover:bg-slate-50/60 transition group">
                      {/* Date & Time */}
                      <td className="py-3.5 px-5 font-medium text-slate-800 whitespace-nowrap">
                        {formatDate(log.createdAt || log.date)}
                      </td>

                      {/* User */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${avatarColor}`}>
                            {initials}
                          </div>
                          <span className="font-semibold text-slate-800">
                            {log.user?.name || 'Dr. Karan Roy'}
                          </span>
                        </div>
                      </td>

                      {/* Action Pill */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${actionCfg.badgeClass}`}
                        >
                          <ActionIcon size={12} strokeWidth={2.5} />
                          {log.action}
                        </span>
                      </td>

                      {/* Module */}
                      <td className="py-3.5 px-4 font-semibold text-slate-700 whitespace-nowrap">
                        {log.module}
                      </td>

                      {/* Details */}
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate" title={log.details}>
                        {log.details}
                      </td>

                      {/* IP Address */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {log.ipAddress || '203.122.45.18'}
                      </td>

                      {/* 3 dots action menu */}
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          title="View Log Details"
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer with Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-white">
          <span>
            Showing {startRecord}-{endRecord} of {total} logs
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="w-7 h-7 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition"
            >
              <ChevronLeft size={15} />
            </button>

            {renderPaginationButtons()}

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="w-7 h-7 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Slide-over details drawer */}
      <LogDetailDrawer
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        log={selectedLog}
      />
    </div>
  );
};

export default ActivityLogsSettingsTab;

