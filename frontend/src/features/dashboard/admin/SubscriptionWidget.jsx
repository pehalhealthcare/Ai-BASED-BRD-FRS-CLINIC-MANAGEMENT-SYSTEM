import React from 'react';
import { useNavigate } from 'react-router-dom';

const StorageGauge = ({ usedGB, totalGB }) => {
  const pct = totalGB > 0 ? Math.min(Math.round((usedGB / totalGB) * 100), 100) : 0;
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-20 h-20">
      <svg width="70" height="70" viewBox="0 0 70 70">
        <circle cx="35" cy="35" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="8" />
        <circle
          cx="35" cy="35" r={radius} fill="none"
          stroke={pct > 80 ? '#ef4444' : '#10b981'} strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform="rotate(-90 35 35)"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-sm font-black text-slate-800 leading-none">{pct}%</p>
        <p className="text-[7px] text-slate-400">used</p>
      </div>
    </div>
  );
};

const SubscriptionWidget = ({ subscription, onboarding }) => {
  const navigate = useNavigate();

  const planName = subscription?.plan?.name || subscription?.planName || 'AI Premium Clinic';
  const expiryDate = subscription?.subscription?.expiryDate || subscription?.expiresAt;
  const formattedExpiry = expiryDate
    ? new Date(expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'N/A';

  const usedStorage = onboarding?.usage?.storageUsed || 0;
  const totalStorage = onboarding?.limits?.storageLimit || 300;
  const usedGB = (usedStorage / 1024).toFixed(1);
  const totalGB = (totalStorage / 1024).toFixed(0);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Current Plan ⭐
            </span>
            <h3 className="text-[12px] font-black text-slate-900 mt-2">{planName}</h3>
            <p className="text-[9px] text-slate-400 mt-0.5">Valid till {formattedExpiry}</p>
          </div>
        </div>

        {/* Storage */}
        <div className="bg-slate-50 rounded-xl p-3 mb-3">
          <div className="flex items-center gap-3">
            <StorageGauge usedGB={parseFloat(usedGB)} totalGB={parseFloat(totalGB)} />
            <div>
              <p className="text-[11px] font-bold text-slate-700">Storage Used</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{usedGB} GB / {totalGB} GB</p>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${Math.min((parseFloat(usedGB) / parseFloat(totalGB)) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/admin/subscription')}
          className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-[10px] font-black hover:from-emerald-600 hover:to-teal-600 transition-all cursor-pointer shadow-sm"
        >
          ⬆ Upgrade Plan
        </button>
      </div>

      {/* Contact Support */}
      <div className="border-t border-slate-100 p-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 text-sm flex-shrink-0">
          🎧
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-700">Need Help?</p>
          <button
            onClick={() => navigate('/contact')}
            className="text-[9px] font-bold text-blue-600 hover:underline cursor-pointer"
          >
            Contact Support →
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionWidget;
