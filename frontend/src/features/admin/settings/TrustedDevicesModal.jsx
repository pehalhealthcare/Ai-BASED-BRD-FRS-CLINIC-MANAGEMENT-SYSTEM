import { useState } from 'react';
import { X, Laptop, Smartphone, Trash2, ShieldCheck, Check } from 'lucide-react';
import { clinicApi } from '../../../lib/api';

const DEFAULT_DEVICES = [
  {
    deviceId: 'dev_1',
    deviceName: 'Clinic Reception PC 1',
    browser: 'Chrome 129.0',
    os: 'Windows 11',
    ipAddress: '203.122.45.18',
    lastActive: 'Today, 11:24 AM',
    isCurrent: true
  },
  {
    deviceId: 'dev_2',
    deviceName: 'Doctor Consultation Tablet',
    browser: 'Safari Mobile',
    os: 'iPadOS 17.5',
    ipAddress: '203.122.45.19',
    lastActive: 'Yesterday, 06:15 PM',
    isCurrent: false
  }
];

const TrustedDevicesModal = ({ isOpen, onClose, trustedDevices = [], clinicId, onSaved }) => {
  const [devices, setDevices] = useState(trustedDevices.length > 0 ? trustedDevices : DEFAULT_DEVICES);
  const [feedback, setFeedback] = useState('');

  if (!isOpen) return null;

  const handleRevoke = async (deviceId) => {
    const updated = devices.filter(d => d.deviceId !== deviceId);
    setDevices(updated);
    try {
      await clinicApi.update(clinicId, {
        securitySettings: {
          trustedDevices: updated
        }
      });
      if (onSaved) onSaved(updated);
      setFeedback('Device revoked successfully');
      setTimeout(() => setFeedback(''), 3000);
    } catch (err) {
      console.error('Failed to revoke device:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-scaleUp">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Laptop size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Trusted Devices</h3>
              <p className="text-[11px] text-slate-400">Authorized hardware and browsers for this clinic portal</p>
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

        <div className="p-6 space-y-4">
          {feedback && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <Check size={14} />
              <span>{feedback}</span>
            </div>
          )}

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {devices.map((device) => {
              const isMobile = device.os?.toLowerCase().includes('ios') || device.os?.toLowerCase().includes('android');
              return (
                <div
                  key={device.deviceId}
                  className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                      {isMobile ? <Smartphone size={17} /> : <Laptop size={17} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="text-xs font-bold text-slate-800">{device.deviceName}</h5>
                        {device.isCurrent && (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.2 rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {device.os} • {device.browser} • IP: {device.ipAddress}
                      </p>
                      <p className="text-[10px] text-slate-400">Last active: {device.lastActive}</p>
                    </div>
                  </div>

                  {!device.isCurrent && (
                    <button
                      type="button"
                      onClick={() => handleRevoke(device.deviceId)}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 size={12} />
                      <span>Revoke</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-3 flex justify-end border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-md shadow-blue-200 hover:bg-blue-700 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrustedDevicesModal;

