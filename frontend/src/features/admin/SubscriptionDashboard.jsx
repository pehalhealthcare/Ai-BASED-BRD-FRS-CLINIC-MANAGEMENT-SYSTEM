import { useState, useEffect, useCallback } from 'react';
import { 
  CreditCard, ShieldCheck, CheckCircle2, AlertTriangle, ArrowUpRight, 
  Sparkles, RefreshCw, Layers, Check, Download, AlertCircle, Eye, Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

// API helpers
const API_URL = '/api/v1/subscriptions';

export default function SubscriptionDashboard() {
  const [subData, setSubData] = useState(null);
  const [plans, setPlans] = useState([]);
  const [billingHistory, setBillingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals / Selection state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedTargetPlan, setSelectedTargetPlan] = useState(null);
  const [targetBillingCycle, setTargetBillingCycle] = useState('monthly');
  const [upgradePreview, setUpgradePreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Card input states
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
  };

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [currentRes, plansRes, historyRes] = await Promise.all([
        axios.get(`${API_URL}/current`, getHeaders()),
        axios.get(`${API_URL}/plans`, getHeaders()),
        axios.get(`${API_URL}/billing-history`, getHeaders())
      ]);

      setSubData(currentRes.data?.data || null);
      setPlans(plansRes.data?.data?.plans || []);
      setBillingHistory(historyRes.data?.data?.history || []);
    } catch (err) {
      console.error('Failed to load subscription data:', err);
      toast.error('Could not fetch subscription dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Handle Auto Recharge Toggle
  const handleToggleAutoRecharge = async (checked) => {
    try {
      const payload = {
        autoRecharge: checked
      };
      if (checked) {
        payload.paymentMethod = {
          last4: '4242',
          brand: 'Visa',
          token: 'TOK_AUTO_RECHARGE_CONFIRMED'
        };
      }
      
      const res = await axios.post(`${API_URL}/auto-recharge`, payload, getHeaders());
      if (res.data?.success) {
        toast.success(`Auto-recharge ${checked ? 'enabled' : 'disabled'}!`);
        loadData(false);
      }
    } catch (err) {
      toast.error('Failed to toggle auto-recharge');
    }
  };

  // Preview upgrade proration pricing
  const handlePreviewUpgrade = async (plan, cycle) => {
    setSelectedTargetPlan(plan);
    setTargetBillingCycle(cycle);
    setLoadingPreview(true);
    setUpgradePreview(null);
    try {
      const res = await axios.post(`${API_URL}/upgrade/preview`, {
        targetPlanId: plan._id,
        billingCycle: cycle
      }, getHeaders());
      
      setUpgradePreview(res.data?.data || null);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Upgrade preview failed.');
      setSelectedTargetPlan(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Process manual/upgrade payment
  const handleConfirmUpgrade = async (e) => {
    e.preventDefault();
    if (!selectedTargetPlan) return;
    if (!cardName || !cardNumber || !cardExpiry || !cardCvv) {
      toast.error('Please fill in card billing details.');
      return;
    }

    setProcessingPayment(true);
    try {
      const res = await axios.post(`${API_URL}/upgrade`, {
        targetPlanId: selectedTargetPlan._id,
        billingCycle: targetBillingCycle,
        paymentMethod: {
          last4: cardNumber.slice(-4),
          brand: 'Visa',
          token: `TOK_${Date.now()}`
        }
      }, getHeaders());

      if (res.data?.success) {
        toast.success('Subscription upgraded successfully!');
        setShowUpgradeModal(false);
        setSelectedTargetPlan(null);
        setUpgradePreview(null);
        // Clear card inputs
        setCardName('');
        setCardNumber('');
        setCardExpiry('');
        setCardCvv('');
        loadData(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upgrade payment failed.');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Handle manual renewal
  const handleRenewNow = async () => {
    if (!window.confirm('Confirm renewing your subscription?')) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/renew`, {}, getHeaders());
      if (res.data?.success) {
        toast.success('Subscription renewed successfully!');
        loadData(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to renew.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-2.5">
        <RefreshCw size={24} className="animate-spin text-blue-600" />
        <p className="text-xs font-bold">Synchronizing subscription registry...</p>
      </div>
    );
  }

  const activePlan = subData?.subscription?.planId;
  const usage = subData?.usage || {};
  const currentPlanPrice = activePlan 
    ? (subData.subscription.billingCycle === 'yearly' ? activePlan.priceYearly : activePlan.priceMonthly)
    : 0;

  // Filter plans to show only higher value options
  const upgradablePlans = plans.filter(p => {
    if (!activePlan) return true;
    const pPrice = targetBillingCycle === 'yearly' ? p.priceYearly : p.priceMonthly;
    return pPrice > currentPlanPrice;
  });

  return (
    <div className="space-y-6">
      
      {/* Expiry alerts banner */}
      {usage.remainingDays <= 7 && usage.remainingDays > 0 && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 flex-wrap ${
          usage.remainingDays === 1 
            ? 'bg-rose-50 border-rose-200 text-rose-800' 
            : 'bg-amber-50 border-amber-250 text-amber-800'
        }`}>
          <div className="flex items-center gap-3">
            <AlertTriangle className={usage.remainingDays === 1 ? 'text-rose-600' : 'text-amber-600'} size={20} />
            <div>
              <p className="text-xs font-black">
                {usage.remainingDays === 1 
                  ? 'High Priority: Your subscription expires in less than 24 hours!'
                  : `Your subscription expires in ${usage.remainingDays} days.`
                }
              </p>
              <p className="text-[10px] opacity-90 mt-0.5">Renew now to prevent service and premium analytics disruptions.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleRenewNow}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition ${
                usage.remainingDays === 1 ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-amber-600 text-white hover:bg-amber-700'
              }`}
            >
              Renew Now
            </button>
            <button 
              onClick={() => handleToggleAutoRecharge(true)}
              className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
            >
              Enable Auto Recharge
            </button>
          </div>
        </div>
      )}

      {/* Subscription Card details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Current Plan */}
        <div className="lg:col-span-4 bg-gradient-to-tr from-slate-900 to-slate-800 text-white p-6 rounded-3xl shadow-lg border border-slate-700/30 flex flex-col justify-between min-h-[300px]">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase tracking-wider">
                {subData?.subscription?.status || 'Trial'}
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase">
                {subData?.subscription?.billingCycle || 'monthly'} billing
              </span>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs text-slate-400 font-medium">Current Plan</p>
              <h3 className="text-2xl font-black tracking-tight">{activePlan?.name || 'AI Starter Clinic'}</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase">Valid Until</p>
                <p className="text-xs font-bold text-slate-200 mt-0.5">
                  {subData?.subscription?.expiryDate ? new Date(subData.subscription.expiryDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase">Remaining Days</p>
                <p className="text-xs font-bold text-slate-250 mt-0.5">{usage.remainingDays} Days</p>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase">Auto Recharge</p>
                <p className="text-[11px] font-bold text-slate-200 mt-0.5">
                  {subData?.subscription?.autoRecharge ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <button 
                onClick={() => handleToggleAutoRecharge(!subData?.subscription?.autoRecharge)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition ${
                  subData?.subscription?.autoRecharge 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {subData?.subscription?.autoRecharge ? 'Turn Off' : 'Turn On'}
              </button>
            </div>

            <button 
              onClick={() => setShowUpgradeModal(true)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 text-center text-xs font-black text-white flex items-center justify-center gap-1.5 transition shadow"
            >
              Upgrade Plan <ArrowUpRight size={14} />
            </button>
          </div>
        </div>

        {/* Right Side: Usage progress checks */}
        <div className="lg:col-span-8 bg-white border border-slate-100 shadow-sm p-6 rounded-3xl space-y-6">
          <p className="text-sm font-bold text-slate-800">Resource Consumption & Limits</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {[
              { label: 'Doctors Onboarded', current: usage.doctors, limit: activePlan?.limits?.maxDoctors, unit: 'practitioners' },
              { label: 'Staff Registered', current: usage.staff, limit: activePlan?.limits?.maxStaff, unit: 'users' },
              { label: 'Total Patients', current: usage.patients, limit: activePlan?.limits?.maxPatients, unit: 'members' },
              { label: 'Cloud Storage', current: usage.storageUsedMb, limit: 1000, unit: 'MB' } // Default storage limit
            ].map((item, idx) => {
              const limitVal = item.limit || 999999;
              const isUnlimited = limitVal === 999999;
              const percent = isUnlimited ? 0 : Math.min(100, Math.round((item.current / limitVal) * 100));
              
              return (
                <div key={idx} className="space-y-2 border border-slate-50 p-4 rounded-2xl bg-slate-50/30">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700">{item.label}</span>
                    <span className="font-black text-slate-900">
                      {item.current} / {isUnlimited ? 'Unlimited' : `${limitVal} ${item.unit}`}
                    </span>
                  </div>
                  
                  {!isUnlimited && (
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          percent > 90 ? 'bg-rose-500' : percent > 70 ? 'bg-amber-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  )}
                  <p className="text-[9px] text-slate-400 font-bold uppercase">
                    {isUnlimited ? 'Unlimited consumption quota' : `${percent}% limits consumed`}
                  </p>
                </div>
              );
            })}

          </div>
        </div>

      </div>

      {/* Comparison table */}
      <div className="bg-white border border-slate-100 shadow-sm p-6 rounded-3xl space-y-4">
        <p className="text-sm font-bold text-slate-800">Subscription Plans Comparison</p>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-4">Plan Options</th>
                <th className="py-3 px-4">Monthly Rate</th>
                <th className="py-3 px-4">Doctor Slots</th>
                <th className="py-3 px-4">Staff Slots</th>
                <th className="py-3 px-4">AI Features</th>
                <th className="py-3 px-4">Support Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
              {plans.map((p) => (
                <tr key={p._id} className={p.code === activePlan?.code ? 'bg-blue-50/40 font-bold' : ''}>
                  <td className="py-4 px-4 font-black text-slate-900 flex items-center gap-1.5">
                    {p.name}
                    {p.code === activePlan?.code && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[8px] font-black uppercase">Current</span>
                    )}
                  </td>
                  <td className="py-4 px-4">₹{p.priceMonthly} / mo</td>
                  <td className="py-4 px-4">{p.limits?.maxDoctors === 999999 ? 'Unlimited' : p.limits?.maxDoctors}</td>
                  <td className="py-4 px-4">{p.limits?.maxStaff === 999999 ? 'Unlimited' : p.limits?.maxStaff}</td>
                  <td className="py-4 px-4 font-semibold text-slate-600">
                    {p.features.includes('ai_prescription_suggestions') ? 'Full Suite AI' : p.features.includes('ai_scheduling') ? 'Basic AI' : 'Standard'}
                  </td>
                  <td className="py-4 px-4 font-semibold text-slate-600">
                    {p.code === 'ENTERPRISE' ? 'Priority 24/7' : p.code === 'PREMIUM' ? 'Dedicated support' : 'Standard ticketing'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Billing history table */}
      <div className="bg-white border border-slate-100 shadow-sm p-6 rounded-3xl space-y-4">
        <p className="text-sm font-bold text-slate-800">Billing & Payment History</p>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Selected Plan</th>
                <th className="py-3 px-4">Payment Date</th>
                <th className="py-3 px-4">Billing Period</th>
                <th className="py-3 px-4">Credit Applied</th>
                <th className="py-3 px-4">Amount Paid</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
              {billingHistory.length > 0 ? (
                billingHistory.map((item) => (
                  <tr key={item._id}>
                    <td className="py-4 px-4 font-bold text-slate-900">{item.invoiceNumber}</td>
                    <td className="py-4 px-4 font-bold text-slate-800">{item.planId?.name || 'Subscription'}</td>
                    <td className="py-4 px-4">{new Date(item.paymentDate).toLocaleDateString()}</td>
                    <td className="py-4 px-4 text-slate-500">{item.billingPeriod}</td>
                    <td className="py-4 px-4 text-slate-500">₹{item.creditApplied || 0}</td>
                    <td className="py-4 px-4 font-black text-slate-900">₹{item.amountPaid}</td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[9px] font-black uppercase">
                        {item.paymentStatus}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button 
                        onClick={() => alert(`Downloading slip ${item.invoiceNumber}`)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition inline-flex items-center gap-1 font-bold"
                      >
                        <Download size={13} /> PDF
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-semibold">
                    No subscription invoices logged.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upgrade Plan modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-100 shadow-2xl p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-start relative max-h-[90vh] overflow-y-auto">
            
            {/* Close Button */}
            <button 
              onClick={() => {
                setShowUpgradeModal(false);
                setSelectedTargetPlan(null);
                setUpgradePreview(null);
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition"
            >
              <Check className="rotate-45" size={18} />
            </button>

            {/* Left side: select tier options */}
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-black text-slate-900">Upgrade Subscription Plan</h4>
                <p className="text-xs text-slate-500 mt-1">Select a higher-tier subscription. Downgrades are disabled.</p>
              </div>

              {/* Cycle selection toggle */}
              <div className="flex p-1 rounded-xl bg-slate-100 text-[10px] font-bold text-slate-600 gap-1 w-fit">
                {['monthly', 'yearly'].map((cycle) => (
                  <button 
                    key={cycle}
                    onClick={() => {
                      setTargetBillingCycle(cycle);
                      setSelectedTargetPlan(null);
                      setUpgradePreview(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg transition uppercase ${
                      targetBillingCycle === cycle ? 'bg-white text-slate-950 font-black shadow-sm' : 'hover:bg-white/50'
                    }`}
                  >
                    {cycle}
                  </button>
                ))}
              </div>

              {/* Tiers List */}
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {upgradablePlans.length > 0 ? (
                  upgradablePlans.map((p) => {
                    const price = targetBillingCycle === 'yearly' ? p.priceYearly : p.priceMonthly;
                    const isSelected = selectedTargetPlan?._id === p._id;
                    return (
                      <div 
                        key={p._id}
                        onClick={() => handlePreviewUpgrade(p, targetBillingCycle)}
                        className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition ${
                          isSelected 
                            ? 'bg-blue-50/20 border-blue-600 text-slate-900 shadow-sm' 
                            : 'border-slate-100 hover:border-slate-300 bg-white text-slate-700'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-black">{p.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{p.limits?.maxDoctors === 999999 ? 'Unlimited' : `${p.limits?.maxDoctors} Doctors`}</p>
                        </div>
                        <p className="text-xs font-black">₹{price} / {targetBillingCycle === 'monthly' ? 'mo' : 'yr'}</p>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 font-semibold italic p-4 text-center border border-dashed rounded-2xl">
                    You are already on the highest available tier plan!
                  </p>
                )}
              </div>
            </div>

            {/* Right side: prorated math and mock checkout card */}
            <div className="bg-slate-50 p-6 rounded-3xl space-y-6 border border-slate-100">
              <p className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Upgrade checkout summary</p>

              {loadingPreview && (
                <div className="flex justify-center p-4 text-slate-400 gap-2 items-center text-xs">
                  <RefreshCw size={14} className="animate-spin text-blue-600" />
                  <span>Estimating prorated adjustments...</span>
                </div>
              )}

              {upgradePreview && selectedTargetPlan && (
                <div className="space-y-4">
                  
                  {/* Prorated breakdown */}
                  <div className="space-y-2 text-xs border-b border-slate-200 pb-4">
                    <div className="flex justify-between items-center text-slate-500 font-semibold">
                      <span>Selected Plan Rate</span>
                      <span className="font-bold text-slate-800">₹{upgradePreview.selectedPlanPrice}</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-600 font-semibold">
                      <span>Current Plan Credit (Prorated)</span>
                      <span className="font-black">- ₹{upgradePreview.currentPlanCredit}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500 font-semibold">
                      <span>Credit Applied</span>
                      <span className="font-bold text-slate-800">₹{upgradePreview.creditApplied}</span>
                    </div>
                    <div className="h-px bg-slate-200 my-1" />
                    <div className="flex justify-between items-center font-black text-slate-900 text-sm pt-1">
                      <span>Final Payable Amount</span>
                      <span className="text-blue-600">₹{upgradePreview.finalPayableAmount}</span>
                    </div>
                  </div>

                  {/* Payment checkout form */}
                  <form onSubmit={handleConfirmUpgrade} className="space-y-3.5">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Debit / Credit card</p>
                    
                    <label className="grid gap-1.5 text-[10px] font-bold text-slate-700">
                      Cardholder Name
                      <input 
                        type="text" 
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="John Doe"
                        className="rounded-xl border border-slate-200 p-3 text-xs bg-white focus:border-blue-500 outline-none transition"
                        required
                      />
                    </label>

                    <label className="grid gap-1.5 text-[10px] font-bold text-slate-700">
                      Card Number
                      <input 
                        type="text" 
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="4111 2222 3333 4444"
                        className="rounded-xl border border-slate-200 p-3 text-xs bg-white focus:border-blue-500 outline-none transition"
                        required
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="grid gap-1.5 text-[10px] font-bold text-slate-700">
                        Expiry Date
                        <input 
                          type="text" 
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="MM/YY"
                          className="rounded-xl border border-slate-200 p-3 text-xs bg-white focus:border-blue-500 outline-none transition"
                          required
                        />
                      </label>
                      <label className="grid gap-1.5 text-[10px] font-bold text-slate-700">
                        CVV
                        <input 
                          type="password" 
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          placeholder="•••"
                          className="rounded-xl border border-slate-200 p-3 text-xs bg-white focus:border-blue-500 outline-none transition"
                          required
                        />
                      </label>
                    </div>

                    <button 
                      type="submit"
                      disabled={processingPayment}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow"
                    >
                      {processingPayment ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Authorizing transaction...</span>
                        </>
                      ) : (
                        <span>Pay & Upgrade Now</span>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {!selectedTargetPlan && (
                <div className="h-48 flex items-center justify-center border border-dashed border-slate-200 rounded-3xl bg-white p-4">
                  <p className="text-xs text-slate-400 font-semibold text-center leading-relaxed">
                    Select a tier option on the left to see prorated calculations and complete payment checkout.
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
