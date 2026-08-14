import React from 'react';
import { useNavigate } from 'react-router-dom';

const ALERT_CONFIGS = {
  warning: { icon: '⚠️', bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-700' },
  info: { icon: 'ℹ️', bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700' },
  reminder: { icon: '🔔', bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700' },
  success: { icon: '✅', bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700' },
};

const computeInsights = (overview, queue, doctorStatus) => {
  const insights = [];
  const apptSummary = overview?.appointmentSummary || {};

  if (queue && queue.length > 0) {
    const longWaiters = queue.filter(q => q.waitMinutes > 20);
    if (longWaiters.length > 0) {
      insights.push({
        type: 'warning',
        title: 'Queue Alert',
        message: `${longWaiters.length} patient${longWaiters.length > 1 ? 's' : ''} waiting more than 20 mins.`,
      });
    }
  }

  if (doctorStatus && doctorStatus.length > 0) {
    const busyDoctors = doctorStatus.filter(d => d.utilization > 80);
    if (busyDoctors.length > 0) {
      insights.push({
        type: 'warning',
        title: 'Doctor High Load',
        message: `Dr. ${busyDoctors[0].fullName} has a high patient load (${busyDoctors[0].utilization}% utilization).`,
      });
    }
  }

  if (overview?.cards?.lowStockMedicines > 0) {
    insights.push({
      type: 'warning',
      title: 'Low Pharmacy Stock',
      message: `${overview.cards.lowStockMedicines} medicine${overview.cards.lowStockMedicines > 1 ? 's' : ''} below reorder level.`,
    });
  }

  if (overview?.cards?.amountReceived > 0) {
    insights.push({
      type: 'success',
      title: 'Revenue Update',
      message: `Today's revenue is looking strong. Keep the momentum going!`,
    });
  }

  if (apptSummary.total > 0) {
    const completedPct = apptSummary.completed / apptSummary.total;
    if (completedPct < 0.3 && overview?.isToday) {
      insights.push({
        type: 'info',
        title: 'Appointment Flow',
        message: `${apptSummary.total - apptSummary.completed} appointments still pending for today.`,
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      type: 'success',
      title: 'All systems normal',
      message: 'No critical alerts for today. Clinic is running smoothly.',
    });
  }

  return insights;
};

const AiAssistantPanel = ({ overview, queue, doctorStatus, notifications, loading }) => {
  const navigate = useNavigate();

  const insights = computeInsights(overview, queue, doctorStatus);
  const alertsList = overview?.alerts || [];
  const systemNotifs = notifications?.slice(0, 4) || [];

  return (
    <div className="space-y-4">
      {/* AI Assistant Panel */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50 bg-gradient-to-r from-violet-50 to-blue-50">
          <div className="flex items-center gap-2">
            <span className="text-lg">🤖</span>
            <div>
              <h2 className="text-sm font-black text-slate-900">AI Assistant</h2>
              <p className="text-[9px] text-slate-400">Good morning, King! 🌟</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">Here are today's insights and suggestions.</p>
        </div>

        <div className="p-4 space-y-3 max-h-72 overflow-y-auto">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            ))
          ) : (
            insights.map((insight, idx) => {
              const cfg = ALERT_CONFIGS[insight.type] || ALERT_CONFIGS.info;
              return (
                <div key={idx} className={`flex items-start gap-2.5 p-3 rounded-xl border ${cfg.bg} ${cfg.border}`}>
                  <span className="text-sm flex-shrink-0 mt-0.5">{cfg.icon}</span>
                  <div>
                    <p className={`text-[10px] font-black ${cfg.text} leading-tight`}>{insight.title}</p>
                    <p className="text-[9px] text-slate-500 mt-0.5">{insight.message}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="px-4 pb-4">
          <button
            onClick={() => navigate('/dashboard/notifications')}
            className="w-full text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-xl py-2 transition-colors cursor-pointer"
          >
            View All Insights →
          </button>
        </div>
      </div>

      {/* Alerts & Notifications */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
          <h2 className="text-sm font-black text-slate-900">Alerts & Notifications</h2>
          <button
            onClick={() => navigate('/notifications/logs')}
            className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
          >
            View All
          </button>
        </div>

        <div className="p-4 space-y-2.5 max-h-64 overflow-y-auto">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />
            ))
          ) : alertsList.length === 0 && systemNotifs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs font-bold text-slate-400">No notifications today</p>
            </div>
          ) : (
            [...alertsList, ...systemNotifs].slice(0, 5).map((alert, idx) => {
              const cfg = ALERT_CONFIGS[alert.type] || ALERT_CONFIGS.info;
              return (
                <div key={idx} className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${cfg.bg} ${cfg.border}`}>
                  <span className="text-sm flex-shrink-0">{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-slate-800 leading-tight truncate">
                      {alert.title || alert.type || 'Notification'}
                    </p>
                    <p className="text-[9px] text-slate-500 mt-0.5">
                      {alert.message || alert.content || ''}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default AiAssistantPanel;
