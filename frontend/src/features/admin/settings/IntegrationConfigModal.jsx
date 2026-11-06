import { useState, useEffect } from 'react';
import { X, Check, Loader2, AlertCircle, ShieldAlert } from 'lucide-react';
import { clinicApi } from '../../../lib/api';

const IntegrationConfigModal = ({ isOpen, onClose, integration, clinicId, onSaved }) => {
  const [formData, setFormData] = useState({});
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (integration) {
      setFormData(integration.config || {});
      setError('');
      setSuccess('');
    }
  }, [integration]);

  if (!isOpen || !integration) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTestAndSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setTesting(true);

    try {
      // Call test endpoint
      const testRes = await clinicApi.testIntegration(clinicId, integration.id, formData);
      setSuccess(testRes?.message || 'Connection verified and saved successfully!');
      
      if (onSaved) {
        onSaved(integration.id, {
          ...formData,
          status: 'connected',
          lastSync: new Date().toISOString()
        });
      }

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Integration test failed:', err);
      setError(err?.response?.data?.message || err.message || 'Connection test failed. Please check credentials.');
    } finally {
      setTesting(false);
    }
  };

  const renderFields = () => {
    switch (integration.id) {
      case 'whatsapp':
        return (
          <>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Phone Number ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.phoneNumberId || ''}
                onChange={(e) => handleChange('phoneNumberId', e.target.value)}
                placeholder="e.g. 104928374928"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                WhatsApp Business Account ID
              </label>
              <input
                type="text"
                value={formData.businessAccountId || ''}
                onChange={(e) => handleChange('businessAccountId', e.target.value)}
                placeholder="e.g. 984729384729"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Permanent Access Token / API Key <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                value={formData.apiKey || ''}
                onChange={(e) => handleChange('apiKey', e.target.value)}
                placeholder="EAAGm0PX4ZC..."
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-mono"
              />
            </div>
          </>
        );

      case 'sms':
        return (
          <>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Gateway Provider <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.provider || 'Twilio'}
                onChange={(e) => handleChange('provider', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="Twilio">Twilio</option>
                <option value="Fast2SMS">Fast2SMS (India)</option>
                <option value="MSG91">MSG91</option>
                <option value="Textlocal">Textlocal</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Sender ID / Header <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.senderId || ''}
                onChange={(e) => handleChange('senderId', e.target.value)}
                placeholder="e.g. PEHALC"
                required
                maxLength={6}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 uppercase focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                API Key / Auth Token <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                value={formData.apiKey || ''}
                onChange={(e) => handleChange('apiKey', e.target.value)}
                placeholder="••••••••••••••••"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </>
        );

      case 'email':
        return (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  SMTP Host <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.host || ''}
                  onChange={(e) => handleChange('host', e.target.value)}
                  placeholder="smtp.sendgrid.net"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Port
                </label>
                <input
                  type="number"
                  value={formData.port || 587}
                  onChange={(e) => handleChange('port', Number(e.target.value))}
                  placeholder="587"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Username / Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.user || ''}
                onChange={(e) => handleChange('user', e.target.value)}
                placeholder="apikey or username"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password / API Key <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                value={formData.pass || ''}
                onChange={(e) => handleChange('pass', e.target.value)}
                placeholder="••••••••••••••••"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Sender Email
                </label>
                <input
                  type="email"
                  value={formData.fromEmail || ''}
                  onChange={(e) => handleChange('fromEmail', e.target.value)}
                  placeholder="noreply@clinic.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Sender Name
                </label>
                <input
                  type="text"
                  value={formData.fromName || ''}
                  onChange={(e) => handleChange('fromName', e.target.value)}
                  placeholder="Clinic Notifications"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </>
        );

      case 'lis':
      case 'ris':
        return (
          <>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                System / Provider Name
              </label>
              <input
                type="text"
                value={formData.systemName || ''}
                onChange={(e) => handleChange('systemName', e.target.value)}
                placeholder={integration.id === 'lis' ? 'e.g. CrelioHealth, Attune LIS' : 'e.g. Agfa Health, GE PACS'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                API Endpoint URL <span className="text-rose-500">*</span>
              </label>
              <input
                type="url"
                value={formData.endpointUrl || ''}
                onChange={(e) => handleChange('endpointUrl', e.target.value)}
                placeholder="https://lis-api.example.com/v1"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Authorization Token / API Key
              </label>
              <input
                type="password"
                value={formData.apiKey || ''}
                onChange={(e) => handleChange('apiKey', e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden animate-scaleUp">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${integration.bg} ${integration.color}`}>
              <integration.icon size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Configure {integration.title}</h3>
              <p className="text-[11px] text-slate-400">Enter API credentials to activate</p>
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

        <form onSubmit={handleTestAndSave} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <Check size={14} className="shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {renderFields()}

          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={testing}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={testing}
              className="px-5 py-2 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-md shadow-blue-200 hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {testing ? <Loader2 size={13} className="animate-spin" /> : null}
              <span>{testing ? 'Verifying...' : 'Test & Save'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IntegrationConfigModal;

