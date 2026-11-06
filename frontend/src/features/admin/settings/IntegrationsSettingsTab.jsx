import { useState } from 'react';
import {
  MessageCircle, MessageSquare, Mail, FlaskConical, Stethoscope,
  CreditCard, MoreVertical, CheckCircle2, Clock, ShieldAlert,
  ExternalLink, RefreshCw
} from 'lucide-react';
import IntegrationConfigModal from './IntegrationConfigModal';
import { checkPlanEntitlement } from '../../../utils/planEntitlements';

const INTEGRATION_DEFINITIONS = [
  {
    id: 'whatsapp',
    title: 'WhatsApp Business',
    featureKey: 'WHATSAPP',
    icon: MessageCircle,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    description: 'Send appointment reminders, alerts and updates.'
  },
  {
    id: 'sms',
    title: 'SMS Gateway',
    featureKey: 'SMS',
    icon: MessageSquare,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    description: 'Send SMS notifications to patients and staff.'
  },
  {
    id: 'email',
    title: 'Email Service',
    featureKey: 'EMAIL',
    icon: Mail,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    description: 'Send transactional and notification emails.'
  },
  {
    id: 'lis',
    title: 'Laboratory (LIS)',
    featureKey: 'LABS_LIS',
    icon: FlaskConical,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    description: 'Sync lab orders and receive test results automatically.'
  },
  {
    id: 'ris',
    title: 'Radiology (RIS)',
    featureKey: 'RADIOLOGY_RIS',
    icon: Stethoscope,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    description: 'Integrate with radiology systems for reports and imaging.'
  },
  {
    id: 'payment',
    title: 'Payment Gateway',
    featureKey: null,
    icon: CreditCard,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    description: 'Accept online payments for bills and consultations.',
    isComingSoon: true
  }
];

const IntegrationsSettingsTab = ({ clinic, clinicId, onClinicUpdated }) => {
  const [activeIntegration, setActiveIntegration] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);

  const getStatus = (item) => {
    if (item.isComingSoon) {
      return { label: 'Coming Soon', connected: false, comingSoon: true };
    }

    const integrations = clinic?.integrations || {};
    let config = null;

    if (item.id === 'whatsapp') config = integrations.whatsapp;
    else if (item.id === 'sms') config = integrations.smsGateway;
    else if (item.id === 'email') config = integrations.emailService;
    else if (item.id === 'lis') config = integrations.lis;
    else if (item.id === 'ris') config = integrations.ris;

    const isConnected = config?.status === 'connected' || (config?.apiKey || config?.endpointUrl || config?.host);

    return {
      label: isConnected ? 'Connected' : 'Not Connected',
      connected: !!isConnected,
      comingSoon: false,
      config: config || {}
    };
  };

  const handleOpenConfig = (item) => {
    if (item.isComingSoon) return;
    const statusObj = getStatus(item);
    setActiveIntegration({
      ...item,
      config: statusObj.config
    });
    setActiveMenuId(null);
  };

  const handleConfigSaved = (id, newConfig) => {
    if (onClinicUpdated && clinic) {
      const updated = {
        ...clinic,
        integrations: {
          ...(clinic.integrations || {}),
          [id === 'sms' ? 'smsGateway' : id === 'email' ? 'emailService' : id]: newConfig
        }
      };
      onClinicUpdated(updated);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-base font-bold text-slate-800">Integrations</h3>
        <p className="text-xs text-slate-400">
          Connect and manage third-party services to extend your clinic's capabilities.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {INTEGRATION_DEFINITIONS.map((item) => {
          const status = getStatus(item);
          const entitlement = item.featureKey ? checkPlanEntitlement(clinic, item.featureKey) : { allowed: true };
          const isMenuOpen = activeMenuId === item.id;

          return (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition relative"
            >
              <div>
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.bg} ${item.color}`}>
                      <item.icon size={20} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{item.title}</h4>
                      <div className="mt-1">
                        {status.comingSoon ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                            Coming Soon
                          </span>
                        ) : status.connected ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Connected
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200/60">
                            Not Connected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3-dot Menu */}
                  <div className="relative">
                    <button
                      type="button"
                      disabled={item.isComingSoon}
                      onClick={() => setActiveMenuId(isMenuOpen ? null : item.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {isMenuOpen && (
                      <div className="absolute right-0 top-7 w-36 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-20 animate-scaleUp">
                        <button
                          type="button"
                          onClick={() => handleOpenConfig(item)}
                          className="w-full px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                        >
                          {status.connected ? 'Edit Settings' : 'Connect'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-500 mt-3.5 mb-5 leading-relaxed">
                  {item.description}
                </p>

                {/* Subscription Upgrade hint if feature is gated */}
                {!entitlement.allowed && !item.isComingSoon && (
                  <div className="mb-3 p-2 rounded-lg bg-indigo-50/60 border border-indigo-100 text-[10px] font-semibold text-indigo-700 flex items-center gap-1.5">
                    <ShieldAlert size={12} className="shrink-0" />
                    <span>Requires {entitlement.minRequiredPlan}</span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div>
                {item.isComingSoon ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-xs font-semibold cursor-not-allowed text-center"
                  >
                    Coming Soon
                  </button>
                ) : status.connected ? (
                  <button
                    type="button"
                    onClick={() => handleOpenConfig(item)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer text-center"
                  >
                    Configure
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenConfig(item)}
                    className="w-full py-2 px-3 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/60 text-blue-700 text-xs font-semibold transition cursor-pointer text-center"
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {activeIntegration && (
        <IntegrationConfigModal
          isOpen={!!activeIntegration}
          onClose={() => setActiveIntegration(null)}
          integration={activeIntegration}
          clinicId={clinicId}
          onSaved={handleConfigSaved}
        />
      )}
    </div>
  );
};

export default IntegrationsSettingsTab;

