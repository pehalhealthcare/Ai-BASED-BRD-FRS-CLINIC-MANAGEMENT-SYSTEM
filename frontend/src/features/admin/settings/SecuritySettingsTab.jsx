import { useState, useEffect } from 'react';
import {
  ShieldCheck, Lock, Smartphone, Bell,
  UserX, Globe, Laptop, ScrollText, ChevronRight,
  Loader2, Check
} from 'lucide-react';
import { clinicApi } from '../../../lib/api';
import PasswordPolicyModal from './PasswordPolicyModal';
import SessionManagementModal from './SessionManagementModal';
import TrustedDevicesModal from './TrustedDevicesModal';
import IpRestrictionModal from './IpRestrictionModal';

const SecuritySettingsTab = ({ clinic, clinicId, onClinicUpdated, onNavigateToTab }) => {
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [accountLockout, setAccountLockout] = useState(true);
  const [ipRestriction, setIpRestriction] = useState(false);

  // Modals state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showDevicesModal, setShowDevicesModal] = useState(false);
  const [showIpModal, setShowIpModal] = useState(false);

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (clinic?.securitySettings) {
      const sec = clinic.securitySettings;
      setTwoFactorAuth(!!sec.twoFactorAuth);
      setLoginAlerts(sec.loginAlerts ?? true);
      setAccountLockout(sec.accountLockout?.enabled ?? true);
      setIpRestriction(sec.ipRestriction?.enabled ?? false);
    }
  }, [clinic]);

  const updateSetting = async (field, value) => {
    if (!clinicId) return;
    setSaving(true);
    setFeedback('');
    try {
      let payload = {};
      if (field === 'twoFactorAuth') {
        setTwoFactorAuth(value);
        payload = { securitySettings: { twoFactorAuth: value } };
      } else if (field === 'loginAlerts') {
        setLoginAlerts(value);
        payload = { securitySettings: { loginAlerts: value } };
      } else if (field === 'accountLockout') {
        setAccountLockout(value);
        payload = {
          securitySettings: {
            accountLockout: {
              ...(clinic?.securitySettings?.accountLockout || {}),
              enabled: value
            }
          }
        };
      } else if (field === 'ipRestriction') {
        setIpRestriction(value);
        payload = {
          securitySettings: {
            ipRestriction: {
              ...(clinic?.securitySettings?.ipRestriction || {}),
              enabled: value
            }
          }
        };
      }

      const res = await clinicApi.update(clinicId, payload);
      setFeedback('Security settings updated successfully');
      if (onClinicUpdated && res?.data?.clinic) {
        onClinicUpdated(res.data.clinic);
      }
      setTimeout(() => setFeedback(''), 3000);
    } catch (err) {
      console.error('Failed to update security settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div className="p-4 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check size={14} />
            <span>{feedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback('')}
            className="text-slate-400 hover:text-slate-600 font-bold"
          >
            ×
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Card: Account Security */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">Account Security</h3>
            <p className="text-xs text-slate-400">Manage login, authentication and access security.</p>
          </div>

          <div className="space-y-5">
            {/* Two-Factor Authentication (2FA) */}
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Two-Factor Authentication (2FA)</h4>
                  <p className="text-[11px] text-slate-400">Add an extra layer of security to your account.</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={twoFactorAuth}
                onClick={() => updateSetting('twoFactorAuth', !twoFactorAuth)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  twoFactorAuth ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    twoFactorAuth ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Password Policy */}
            <div
              onClick={() => setShowPasswordModal(true)}
              className="flex items-center justify-between py-2 border-b border-slate-50 cursor-pointer hover:bg-slate-50/50 p-2 rounded-xl transition"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Lock size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Password Policy</h4>
                  <p className="text-[11px] text-slate-400">Set rules for strong and secure passwords.</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-400" />
            </div>

            {/* Session Management */}
            <div
              onClick={() => setShowSessionModal(true)}
              className="flex items-center justify-between py-2 border-b border-slate-50 cursor-pointer hover:bg-slate-50/50 p-2 rounded-xl transition"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Smartphone size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Session Management</h4>
                  <p className="text-[11px] text-slate-400">View and manage active login sessions.</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-400" />
            </div>

            {/* Login Alerts */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Bell size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Login Alerts</h4>
                  <p className="text-[11px] text-slate-400">Get notified on new login from unrecognized devices.</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={loginAlerts}
                onClick={() => updateSetting('loginAlerts', !loginAlerts)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  loginAlerts ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    loginAlerts ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Right Card: Access & Control */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">Access & Control</h3>
            <p className="text-xs text-slate-400">Manage access, account lock and security settings.</p>
          </div>

          <div className="space-y-5">
            {/* Account Lockout */}
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <UserX size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Account Lockout</h4>
                  <p className="text-[11px] text-slate-400">Lock account after multiple failed login attempts.</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={accountLockout}
                onClick={() => updateSetting('accountLockout', !accountLockout)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  accountLockout ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    accountLockout ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* IP Restriction */}
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Globe size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">IP Restriction</h4>
                  <p className="text-[11px] text-slate-400">Allow access only from specific IP addresses.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {ipRestriction && (
                  <button
                    type="button"
                    onClick={() => setShowIpModal(true)}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 underline"
                  >
                    Edit IPs
                  </button>
                )}
                <button
                  type="button"
                  role="switch"
                  aria-checked={ipRestriction}
                  onClick={() => {
                    const nextVal = !ipRestriction;
                    updateSetting('ipRestriction', nextVal);
                    if (nextVal) setShowIpModal(true);
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    ipRestriction ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      ipRestriction ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Trusted Devices */}
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Laptop size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Trusted Devices</h4>
                  <p className="text-[11px] text-slate-400">Manage devices that can access the clinic account.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDevicesModal(true)}
                className="px-3.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition cursor-pointer"
              >
                View Devices
              </button>
            </div>

            {/* Security Logs */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <ScrollText size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Security Logs</h4>
                  <p className="text-[11px] text-slate-400">Review security-related activities and events.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onNavigateToTab) {
                    onNavigateToTab('Activity Logs');
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition cursor-pointer"
              >
                View Logs
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-modals */}
      <PasswordPolicyModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        policy={clinic?.securitySettings?.passwordPolicy}
        clinicId={clinicId}
        onSaved={(policy) => {
          if (onClinicUpdated && clinic) {
            onClinicUpdated({
              ...clinic,
              securitySettings: {
                ...(clinic.securitySettings || {}),
                passwordPolicy: policy
              }
            });
          }
        }}
      />

      <SessionManagementModal
        isOpen={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        securitySettings={clinic?.securitySettings}
        clinicId={clinicId}
        onSaved={(sessionData) => {
          if (onClinicUpdated && clinic) {
            onClinicUpdated({
              ...clinic,
              securitySettings: {
                ...(clinic.securitySettings || {}),
                sessionManagement: sessionData
              }
            });
          }
        }}
      />

      <TrustedDevicesModal
        isOpen={showDevicesModal}
        onClose={() => setShowDevicesModal(false)}
        trustedDevices={clinic?.securitySettings?.trustedDevices}
        clinicId={clinicId}
        onSaved={(devices) => {
          if (onClinicUpdated && clinic) {
            onClinicUpdated({
              ...clinic,
              securitySettings: {
                ...(clinic.securitySettings || {}),
                trustedDevices: devices
              }
            });
          }
        }}
      />

      <IpRestrictionModal
        isOpen={showIpModal}
        onClose={() => setShowIpModal(false)}
        allowedIps={clinic?.securitySettings?.ipRestriction?.allowedIps}
        clinicId={clinicId}
        onSaved={(ips) => {
          if (onClinicUpdated && clinic) {
            onClinicUpdated({
              ...clinic,
              securitySettings: {
                ...(clinic.securitySettings || {}),
                ipRestriction: {
                  enabled: ips.length > 0,
                  allowedIps: ips
                }
              }
            });
          }
        }}
      />
    </div>
  );
};

export default SecuritySettingsTab;

