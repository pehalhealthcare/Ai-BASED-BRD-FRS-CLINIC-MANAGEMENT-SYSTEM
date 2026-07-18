import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck, ChevronDown, ChevronUp, Save, CheckCircle2,
  AlertCircle, Info, Users, Settings2, Percent, IndianRupee,
  ToggleLeft, ToggleRight, Loader2, RefreshCw, Building2
} from "lucide-react";
import { clinicApi } from "../../lib/api";
import useAuth from "../../hooks/useAuth";

const POLICIES = [
  {
    id: "admin_only",
    label: "Clinic Admin Approval Only",
    badge: "Policy 1",
    badgeColor: "bg-blue-100 text-blue-700",
    icon: Building2,
    iconColor: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    description: "All discount and waiver requests go directly to the Clinic Admin for approval. The doctor is not notified.",
    workflow: ["Receptionist", "Raises Request", "Clinic Admin", "Approve / Reject", "Payment"],
    recommendedFor: ["Multi-specialty clinics", "Corporate clinics", "Multi-branch clinics"],
    hasLimits: false
  },
  {
    id: "doctor_first",
    label: "Doctor First Approval",
    badge: "Policy 2",
    badgeColor: "bg-emerald-100 text-emerald-700",
    icon: Users,
    iconColor: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    description: "Only the doctor with whom the appointment is booked receives and decides on the discount request.",
    workflow: ["Receptionist", "Doctor", "Approve / Reject", "Payment"],
    recommendedFor: ["Small clinics", "Personal practices", "Owner-operated clinics"],
    hasLimits: false
  },
  {
    id: "doctor_first_with_limits",
    label: "Doctor First with Approval Limits",
    badge: "Policy 2A",
    badgeColor: "bg-amber-100 text-amber-700",
    icon: Settings2,
    iconColor: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    description: "Doctor can approve discounts up to a configurable limit. Anything exceeding the limit automatically escalates to the Clinic Admin.",
    workflow: ["Receptionist", "Doctor", "Within Limit: Approve", "Exceeds Limit: Clinic Admin", "Payment"],
    recommendedFor: ["Mid-size clinics", "Shared practices", "Clinics with financial controls"],
    hasLimits: true
  },
  {
    id: "doctor_then_admin",
    label: "Doctor Then Clinic Admin",
    badge: "Policy 3",
    badgeColor: "bg-violet-100 text-violet-700",
    icon: ShieldCheck,
    iconColor: "text-violet-600",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
    description: "Both the doctor and the Clinic Admin must approve sequentially. The Admin only steps in after the Doctor has approved.",
    workflow: ["Receptionist", "Doctor Approves", "Clinic Admin Approves", "Payment"],
    recommendedFor: ["Large clinics", "Premium hospitals", "Financially controlled organizations"],
    hasLimits: false
  },
  {
    id: "doctor_or_admin",
    label: "Doctor OR Clinic Admin (First Wins)",
    badge: "Policy 4",
    badgeColor: "bg-rose-100 text-rose-700",
    icon: RefreshCw,
    iconColor: "text-rose-600",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
    description: "Both the Doctor and Clinic Admin receive the request simultaneously. The first to approve wins — the other request is auto-cancelled.",
    workflow: ["Receptionist", "Doctor + Admin notified", "First Approval Wins", "Payment"],
    recommendedFor: ["Fast-paced clinics", "Flexible delegation clinics", "Emergency OPDs"],
    hasLimits: false
  },
  {
    id: "dual_approval",
    label: "Dual Approval",
    badge: "Policy 5",
    badgeColor: "bg-slate-100 text-slate-700",
    icon: CheckCircle2,
    iconColor: "text-slate-600",
    bgColor: "bg-slate-50",
    borderColor: "border-slate-200",
    description: "Both the Doctor AND the Clinic Admin must approve. The appointment cannot proceed until both have individually approved.",
    workflow: ["Receptionist", "Doctor Approves", "Clinic Admin Approves", "Both Mandatory", "Payment"],
    recommendedFor: ["High-value consultations", "Premium hospitals", "Strict audit environments"],
    hasLimits: false
  }
];

const BillingPolicySettings = () => {
  const { user } = useAuth();
  const clinicId = user?.clinicId?._id || user?.clinicId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [selectedPolicy, setSelectedPolicy] = useState("admin_only");
  const [procedureBillingPolicy, setProcedureBillingPolicy] = useState("payment_before_procedure");
  const [doctorMaxPct, setDoctorMaxPct] = useState(20);
  const [doctorMaxAmt, setDoctorMaxAmt] = useState("");
  const [allowFullWaiver, setAllowFullWaiver] = useState(false);
  const [escalateAuto, setEscalateAuto] = useState(true);
  const [slotTimeout, setSlotTimeout] = useState(15);
  const [approvalTimeout, setApprovalTimeout] = useState(15);
  const [paymentTimeout, setPaymentTimeout] = useState(15);
  const [activeDoctorCount, setActiveDoctorCount] = useState(null);
  const [suggestedPolicy, setSuggestedPolicy] = useState(null);
  const [expandedPolicy, setExpandedPolicy] = useState(null);

  const loadSettings = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    setError("");
    try {
      const res = await clinicApi.getBillingSettings(clinicId);
      const s = res?.data?.billingSettings || {};
      setSelectedPolicy(s.approvalPolicy || "admin_only");
      setProcedureBillingPolicy(s.procedureBillingPolicy || "payment_before_procedure");
      setDoctorMaxPct(s.doctorMaxDiscountPercent ?? 20);
      setDoctorMaxAmt(s.doctorMaxDiscountAmount != null ? s.doctorMaxDiscountAmount : "");
      setAllowFullWaiver(s.allowDoctorFullWaiver ?? false);
      setEscalateAuto(s.escalateWhenLimitExceeds ?? true);
      setSlotTimeout(s.slotReservationTimeoutMinutes ?? 15);
      setApprovalTimeout(s.approvalTimeoutMinutes ?? 15);
      setPaymentTimeout(s.paymentTimeoutMinutes ?? 15);
      setActiveDoctorCount(res?.data?.activeDoctorCount ?? null);
      setSuggestedPolicy(res?.data?.suggestedDefaultPolicy ?? null);
    } catch (err) {
      setError("Failed to load billing settings.");
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const handleSave = async () => {
    if (!clinicId) return;
    setSaving(true);
    setSuccess("");
    setError("");
    try {
      await clinicApi.updateBillingSettings(clinicId, {
        approvalPolicy: selectedPolicy,
        procedureBillingPolicy: procedureBillingPolicy,
        doctorMaxDiscountPercent: Number(doctorMaxPct),
        doctorMaxDiscountAmount: doctorMaxAmt !== "" ? Number(doctorMaxAmt) : null,
        allowDoctorFullWaiver: allowFullWaiver,
        escalateWhenLimitExceeds: escalateAuto,
        slotReservationTimeoutMinutes: Number(slotTimeout),
        approvalTimeoutMinutes: Number(approvalTimeout),
        paymentTimeoutMinutes: Number(paymentTimeout)
      });
      setSuccess("Billing settings saved successfully.");
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const activePolicy = POLICIES.find(p => p.id === selectedPolicy);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="animate-spin mb-3" size={28} />
        <p className="text-sm font-semibold">Loading billing settings…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="text-teal-600" size={22} />
            Consultation Fee Approval Policy
          </h2>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">
            Configure who has the authority to approve consultation fee discounts and waivers raised by receptionists.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-xl shadow-sm transition-all"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>

      {/* Toast */}
      {success && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm font-semibold">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm font-semibold">
          <AlertCircle size={16} className="text-rose-500 shrink-0" />
          {error}
        </div>
      )}

      {/* Suggested Default Banner */}
      {suggestedPolicy && suggestedPolicy !== selectedPolicy && (
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl text-sm">
          <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Suggested default: </span>
            {activeDoctorCount === 1
              ? "Your clinic has 1 active doctor — \"Doctor First Approval\" is recommended."
              : `Your clinic has ${activeDoctorCount} active doctors — "Clinic Admin Approval Only" is recommended.`}
            <button
              onClick={() => setSelectedPolicy(suggestedPolicy)}
              className="ml-2 text-blue-600 font-extrabold underline underline-offset-2 hover:text-blue-800"
            >
              Apply suggestion
            </button>
          </div>
        </div>
      )}

      {/* Policy Cards */}
      <div className="space-y-3">
        <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Select Approval Policy</h3>

        {POLICIES.map((policy) => {
          const Icon = policy.icon;
          const isSelected = selectedPolicy === policy.id;
          const isExpanded = expandedPolicy === policy.id;

          return (
            <div
              key={policy.id}
              className={`rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
                isSelected
                  ? `${policy.borderColor} ${policy.bgColor} shadow-sm`
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div
                className="flex items-center gap-4 p-4 cursor-pointer"
                onClick={() => setSelectedPolicy(policy.id)}
              >
                {/* Radio */}
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                  isSelected ? "border-teal-600 bg-teal-600" : "border-slate-300 bg-white"
                }`}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>

                <div className={`p-2 rounded-xl ${policy.bgColor} ${isSelected ? "" : "opacity-60"}`}>
                  <Icon size={16} className={policy.iconColor} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-extrabold text-slate-900">{policy.label}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${policy.badgeColor}`}>{policy.badge}</span>
                    {policy.hasLimits && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">Configurable</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{policy.description}</p>
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); setExpandedPolicy(isExpanded ? null : policy.id); }}
                  className="text-slate-400 hover:text-slate-600 shrink-0"
                >
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-6 pb-5 pt-1 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">Workflow</p>
                    <div className="flex flex-col gap-1">
                      {policy.workflow.map((step, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${policy.badgeColor}`}>{i + 1}</div>
                          <span className="text-xs font-semibold text-slate-700">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">Recommended For</p>
                    <ul className="space-y-1">
                      {policy.recommendedFor.map((item, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-slate-600 font-semibold">
                          <CheckCircle2 size={11} className="text-teal-500 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Limits Config Panel — Policy 2A only, when selected */}
              {policy.id === "doctor_first_with_limits" && isSelected && (
                <div className="mx-4 mb-4 p-5 bg-white border border-amber-100 rounded-xl space-y-5">
                  <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <Settings2 size={13} className="text-amber-600" />
                    Doctor Approval Limits
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Maximum Discount Percentage</label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Percent size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="number"
                            min="0" max="100"
                            value={doctorMaxPct}
                            onChange={(e) => setDoctorMaxPct(Math.min(100, Math.max(0, Number(e.target.value))))}
                            className="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-400">%</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Doctor can approve up to this % without escalation</p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Maximum Discount Amount</label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <IndianRupee size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="number"
                            min="0"
                            placeholder="e.g. 300"
                            value={doctorMaxAmt}
                            onChange={(e) => setDoctorMaxAmt(e.target.value)}
                            className="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-400">₹</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Leave blank to use percentage only</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-700">Allow Doctors to Approve Full Fee Waivers</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">If disabled, all full waivers escalate to Clinic Admin.</p>
                    </div>
                    <button
                      onClick={() => setAllowFullWaiver(!allowFullWaiver)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        allowFullWaiver ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                      }`}
                    >
                      {allowFullWaiver ? <><ToggleRight size={14} /> Yes</> : <><ToggleLeft size={14} /> No</>}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-700">Escalate Automatically When Limit Exceeds</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Auto-route to Admin when doctor limit is exceeded.</p>
                    </div>
                    <button
                      onClick={() => setEscalateAuto(!escalateAuto)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        escalateAuto ? "bg-teal-100 text-teal-700 hover:bg-teal-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {escalateAuto ? <><CheckCircle2 size={13} /> Enabled</> : <><AlertCircle size={13} /> Disabled</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Procedure Billing Policy Settings */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Building2 className="text-teal-600" size={16} />
            Procedure Billing Policy
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Configure whether patient procedures can be started prior to payment confirmation, or if payment is strictly required beforehand.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => setProcedureBillingPolicy("payment_before_procedure")}
            className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col justify-between transition-all duration-200 ${
              procedureBillingPolicy === "payment_before_procedure"
                ? "border-teal-500 bg-teal-50/50 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                procedureBillingPolicy === "payment_before_procedure" ? "border-teal-600 bg-teal-600" : "border-slate-300 bg-white"
              }`}>
                {procedureBillingPolicy === "payment_before_procedure" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <span className="text-xs font-extrabold text-slate-900">Payment Before Procedure</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
              Patient must complete payment at Reception. The procedure is locked and cannot be started until receipt is generated. (Highly Recommended)
            </p>
          </div>

          <div
            onClick={() => setProcedureBillingPolicy("payment_after_procedure")}
            className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col justify-between transition-all duration-200 ${
              procedureBillingPolicy === "payment_after_procedure"
                ? "border-teal-500 bg-teal-50/50 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                procedureBillingPolicy === "payment_after_procedure" ? "border-teal-600 bg-teal-600" : "border-slate-300 bg-white"
              }`}>
                {procedureBillingPolicy === "payment_after_procedure" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <span className="text-xs font-extrabold text-slate-900">Payment After Procedure</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
              Procedures can be performed immediately. Billing and invoice collection are handled post-procedure or at patient checkout.
            </p>
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-extrabold text-slate-700 flex items-center gap-2">
          <Settings2 size={15} className="text-slate-500" />
          Advanced Settings
        </h3>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-slate-800">Slot Reservation Timeout</p>
            <p className="text-xs text-slate-400 mt-0.5">Minutes a slot is held pending payment before being released back to the queue.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="number"
              min="5" max="120"
              value={slotTimeout}
              onChange={(e) => setSlotTimeout(Math.min(120, Math.max(5, Number(e.target.value))))}
              className="w-20 text-center py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 bg-white"
            />
            <span className="text-xs font-bold text-slate-400">mins</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
          <div>
            <p className="text-sm font-bold text-slate-800">Approval Request Expiry</p>
            <p className="text-xs text-slate-400 mt-0.5">Minutes an approval request remains pending before automatically expiring.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="number"
              min="1" max="1440"
              value={approvalTimeout}
              onChange={(e) => setApprovalTimeout(Math.min(1440, Math.max(1, Number(e.target.value))))}
              className="w-20 text-center py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 bg-white"
            />
            <span className="text-xs font-bold text-slate-400">mins</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
          <div>
            <p className="text-sm font-bold text-slate-800">Payment Expiry Timeout</p>
            <p className="text-xs text-slate-400 mt-0.5">Minutes payment collection remains pending after approval before expiring.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="number"
              min="1" max="1440"
              value={paymentTimeout}
              onChange={(e) => setPaymentTimeout(Math.min(1440, Math.max(1, Number(e.target.value))))}
              className="w-20 text-center py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 bg-white"
            />
            <span className="text-xs font-bold text-slate-400">mins</span>
          </div>
        </div>

        {activePolicy && (
          <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle2 size={16} className="text-teal-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-extrabold text-teal-800">Currently Active Policy</p>
              <p className="text-sm font-bold text-teal-900 mt-0.5">{activePolicy.label}</p>
              <p className="text-xs text-teal-700 mt-1 leading-relaxed">{activePolicy.description}</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Save */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <p className="text-xs text-slate-400 font-medium">Changes take effect immediately for all new discount/waiver requests.</p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 text-white text-sm font-extrabold rounded-xl shadow-md transition-all"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </div>
  );
};

export default BillingPolicySettings;
