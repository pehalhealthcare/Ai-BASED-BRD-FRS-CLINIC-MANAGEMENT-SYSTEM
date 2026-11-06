import { useState, useEffect } from 'react';
import { Mail, MessageSquare, MessageCircle, Bell, Check, Loader2 } from 'lucide-react';
import { clinicApi } from '../../../lib/api';

const DEFAULT_CHANNELS = {
  email: true,
  sms: true,
  whatsapp: true,
  inApp: true
};

const DEFAULT_EVENTS = {
  appointmentConfirmation: true,
  appointmentReminder: true,
  appointmentReschedule: true,
  appointmentCancellation: true,
  patientRegistration: true,
  invoicePaymentUpdates: true,
  labReportReady: false
};

const EVENT_ITEMS = [
  { key: 'appointmentConfirmation', label: 'Appointment Confirmation' },
  { key: 'appointmentReminder', label: 'Appointment Reminder' },
  { key: 'appointmentReschedule', label: 'Appointment Reschedule' },
  { key: 'appointmentCancellation', label: 'Appointment Cancellation' },
  { key: 'patientRegistration', label: 'Patient Registration' },
  { key: 'invoicePaymentUpdates', label: 'Invoice & Payment Updates' },
  { key: 'labReportReady', label: 'Lab Report Ready' }
];

const NotificationsSettingsTab = ({ clinic, clinicId, onClinicUpdated }) => {
  const [channels, setChannels] = useState(DEFAULT_CHANNELS);
  const [events, setEvents] = useState(DEFAULT_EVENTS);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  useEffect(() => {
    if (clinic?.notificationSettings) {
      const ns = clinic.notificationSettings;
      setChannels({
        email: ns.channels?.email ?? DEFAULT_CHANNELS.email,
        sms: ns.channels?.sms ?? DEFAULT_CHANNELS.sms,
        whatsapp: ns.channels?.whatsapp ?? DEFAULT_CHANNELS.whatsapp,
        inApp: ns.channels?.inApp ?? DEFAULT_CHANNELS.inApp
      });
      setEvents({
        appointmentConfirmation: ns.events?.appointmentConfirmation ?? DEFAULT_EVENTS.appointmentConfirmation,
        appointmentReminder: ns.events?.appointmentReminder ?? DEFAULT_EVENTS.appointmentReminder,
        appointmentReschedule: ns.events?.appointmentReschedule ?? DEFAULT_EVENTS.appointmentReschedule,
        appointmentCancellation: ns.events?.appointmentCancellation ?? DEFAULT_EVENTS.appointmentCancellation,
        patientRegistration: ns.events?.patientRegistration ?? DEFAULT_EVENTS.patientRegistration,
        invoicePaymentUpdates: ns.events?.invoicePaymentUpdates ?? DEFAULT_EVENTS.invoicePaymentUpdates,
        labReportReady: ns.events?.labReportReady ?? DEFAULT_EVENTS.labReportReady
      });
    }
  }, [clinic]);

  const toggleChannel = (key) => {
    setChannels(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleEvent = (key) => {
    setEvents(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!clinicId) return;
    setSaving(true);
    setFeedback({ type: '', message: '' });
    try {
      const payload = {
        notificationSettings: {
          channels,
          events
        }
      };
      const res = await clinicApi.update(clinicId, payload);
      setFeedback({ type: 'success', message: 'Notification preferences saved successfully!' });
      if (onClinicUpdated && res?.data?.clinic) {
        onClinicUpdated(res.data.clinic);
      }
      setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
    } catch (err) {
      console.error('Failed to save notification settings:', err);
      setFeedback({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to save notification preferences. Please try again.'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {feedback.message && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback({ type: '', message: '' })}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Card: Notification Preferences */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">Notification Preferences</h3>
            <p className="text-xs text-slate-400">Configure how and when your clinic sends notifications.</p>
          </div>

          <div className="space-y-5">
            {/* Email Notifications */}
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Mail size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Email Notifications</h4>
                  <p className="text-[11px] text-slate-400">Send appointment, billing and other updates via email.</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={channels.email}
                onClick={() => toggleChannel('email')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  channels.email ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    channels.email ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* SMS Notifications */}
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">SMS Notifications</h4>
                  <p className="text-[11px] text-slate-400">Send important alerts and reminders via SMS.</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={channels.sms}
                onClick={() => toggleChannel('sms')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  channels.sms ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    channels.sms ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* WhatsApp Notifications */}
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <MessageCircle size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">WhatsApp Notifications</h4>
                  <p className="text-[11px] text-slate-400">Send appointment reminders and updates on WhatsApp.</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={channels.whatsapp}
                onClick={() => toggleChannel('whatsapp')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  channels.whatsapp ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    channels.whatsapp ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* In-App Notifications */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Bell size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">In-App Notifications</h4>
                  <p className="text-[11px] text-slate-400">Receive real-time updates inside the application.</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={channels.inApp}
                onClick={() => toggleChannel('inApp')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  channels.inApp ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    channels.inApp ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Right Card: Notification Events */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">Notification Events</h3>
            <p className="text-xs text-slate-400">Choose which events should trigger notifications.</p>
          </div>

          <div className="space-y-3.5 pt-1">
            {EVENT_ITEMS.map((item) => {
              const checked = !!events[item.key];
              return (
                <label
                  key={item.key}
                  onClick={() => toggleEvent(item.key)}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50/80 cursor-pointer transition select-none group"
                >
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                      checked
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-slate-300 bg-white group-hover:border-slate-400'
                    }`}
                  >
                    {checked && <Check size={12} strokeWidth={3} />}
                  </div>
                  <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900">
                    {item.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-md shadow-blue-200 hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          <span>{saving ? 'Saving...' : 'Save Notification Settings'}</span>
        </button>
      </div>
    </div>
  );
};

export default NotificationsSettingsTab;

