import { X, Calendar, User, Shield, Globe, Terminal, Info } from 'lucide-react';

const LogDetailDrawer = ({ isOpen, onClose, log }) => {
  if (!isOpen || !log) return null;

  const formatDate = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl border-l border-slate-100 flex flex-col animate-slideLeft">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Info size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Audit Log Details</h3>
                <p className="text-[11px] text-slate-400 font-mono">ID: {String(log._id).slice(-8)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Action & Module Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Action</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {log.action}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-500 font-medium">Target Module:</span>
                <span className="font-bold text-slate-800">{log.module}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Status:</span>
                <span className="font-bold text-emerald-600">{log.status || 'SUCCESS'}</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Details</h5>
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 font-medium leading-relaxed">
                {log.details || 'No extended description recorded.'}
              </div>
            </div>

            {/* User Info */}
            <div>
              <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Performed By</h5>
              <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {log.user?.initials || 'SA'}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{log.user?.name || 'System Administrator'}</h4>
                  <p className="text-[11px] text-slate-500">{log.user?.email || 'system@pehal.com'}</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">Role: {log.user?.role || 'Admin'}</p>
                </div>
              </div>
            </div>

            {/* Metadata & Audit Information */}
            <div className="space-y-3">
              <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Network & Environment</h5>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Calendar size={13} /> Timestamp
                  </span>
                  <span className="font-medium text-slate-800">{formatDate(log.createdAt || log.date)}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Globe size={13} /> IP Address
                  </span>
                  <span className="font-mono text-slate-800 font-medium">{log.ipAddress || '203.122.45.18'}</span>
                </div>
              </div>
            </div>

            {/* Payload JSON */}
            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <div>
                <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Terminal size={12} /> Payload Diff / Metadata
                </h5>
                <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto max-h-48">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogDetailDrawer;

