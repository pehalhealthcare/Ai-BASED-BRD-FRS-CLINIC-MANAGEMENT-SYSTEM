import React, { useState, useEffect } from 'react';
import { Lock, Sparkles, Check, RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api';
import useAuth from '../hooks/useAuth';

const PremiumFeaturePlaceholder = ({ featureCode, featureName, description, onRequested }) => {
  const { user } = useAuth();
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  
  // Upgrade state variables
  const [eligiblePlans, setEligiblePlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
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

  const isAdmin = user?.role === 'ADMIN';

  // Load plans containing this feature
  useEffect(() => {
    if (!isAdmin) return;
    const fetchEligiblePlans = async () => {
      setLoadingPlans(true);
      try {
        const res = await apiClient.get('/subscriptions/plans');
        const allPlans = res.data?.plans || res.plans || [];
        
        // Filter plans containing this featureCode
        const matched = allPlans.filter(p => p.features.includes(featureCode));
        setEligiblePlans(matched);
      } catch (err) {
        console.error('Failed to load eligible upgrade plans:', err);
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchEligiblePlans();
  }, [isAdmin, featureCode]);

  const handleRequestAccess = async () => {
    setRequesting(true);
    try {
      await apiClient.post('/clinics/features/request-access', { featureCode });
      setRequested(true);
      toast.success(`Access request for ${featureName} sent to Clinic Admin!`);
      if (onRequested) onRequested();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request.');
    } finally {
      setRequesting(false);
    }
  };

  const handleChoosePlan = async (plan) => {
    setSelectedTargetPlan(plan);
    setTargetBillingCycle('monthly');
    setLoadingPreview(true);
    setUpgradePreview(null);
    setShowUpgradeModal(true);

    try {
      const res = await apiClient.post('/subscriptions/upgrade/preview', {
        targetPlanId: plan._id,
        billingCycle: 'monthly'
      });
      setUpgradePreview(res.data?.data || res.data || null);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Upgrade preview failed.');
      setShowUpgradeModal(false);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handlePreviewUpgradeForCycle = async (cycle) => {
    if (!selectedTargetPlan) return;
    setTargetBillingCycle(cycle);
    setLoadingPreview(true);
    setUpgradePreview(null);
    try {
      const res = await apiClient.post('/subscriptions/upgrade/preview', {
        targetPlanId: selectedTargetPlan._id,
        billingCycle: cycle
      });
      setUpgradePreview(res.data?.data || res.data || null);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Upgrade preview failed.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmUpgrade = async (e) => {
    e.preventDefault();
    if (!selectedTargetPlan) return;
    if (!cardName || !cardNumber || !cardExpiry || !cardCvv) {
      toast.error('Please enter complete credit card billing details.');
      return;
    }

    setProcessingPayment(true);
    try {
      const res = await apiClient.post('/subscriptions/upgrade', {
        targetPlanId: selectedTargetPlan._id,
        billingCycle: targetBillingCycle,
        paymentMethod: {
          last4: cardNumber.slice(-4),
          brand: 'Visa',
          token: `TOK_${Date.now()}`
        }
      });

      if (res.data?.success) {
        toast.success('Subscription plan upgraded successfully!');
        setShowUpgradeModal(false);
        setSelectedTargetPlan(null);
        setUpgradePreview(null);
        setCardName('');
        setCardNumber('');
        setCardExpiry('');
        setCardCvv('');
        window.location.reload(); // Refresh the app context
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Subscription upgrade payment failed.');
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <div className="relative overflow-hidden bg-slate-900/50 border border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center text-center space-y-6 min-h-[300px] backdrop-blur-md text-slate-100">
      
      {/* Decorative gradient blurs */}
      <div className="absolute -right-10 -top-10 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -left-10 -bottom-10 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="w-12 h-12 bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/35 rounded-2xl flex items-center justify-center text-amber-400 shadow-md">
        <Lock size={20} className="animate-pulse" />
      </div>

      <div className="space-y-2 max-w-lg relative z-10">
        <h4 className="text-sm font-black text-white flex items-center justify-center gap-1.5">
          <Sparkles size={14} className="text-amber-400" />
          {featureName} Locked 🔒
        </h4>
        <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
          {description || `Currently, the "${featureName}" feature is unavailable with your current plan. Choose to upgrade to unlock this feature immediately.`}
        </p>
      </div>

      {/* Render plans list right there if user is Admin */}
      {isAdmin ? (
        <div className="w-full max-w-xl space-y-4 relative z-10">
          <div className="h-px bg-slate-800/80 my-2" />
          <p className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Available Plans with this Feature</p>
          
          {loadingPlans ? (
            <div className="flex items-center justify-center p-4 text-slate-500 gap-2 text-xs">
              <RefreshCw size={12} className="animate-spin" />
              <span>Scanning subscription catalog...</span>
            </div>
          ) : eligiblePlans.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {eligiblePlans.map((plan) => (
                <div key={plan._id} className="p-3.5 rounded-2xl border border-slate-800 bg-slate-900/30 flex flex-col justify-between items-start text-left gap-3">
                  <div>
                    <p className="text-xs font-black text-white">{plan.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">₹{plan.priceMonthly} / month</p>
                  </div>
                  <button 
                    onClick={() => handleChoosePlan(plan)}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase transition shadow-sm w-full text-center"
                  >
                    Upgrade Now
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">No higher tier plans registered with this feature.</p>
          )}
        </div>
      ) : (
        <button
          onClick={handleRequestAccess}
          disabled={requesting || requested}
          className={`relative z-10 px-5 py-2.5 rounded-xl text-xs font-black tracking-wide transition flex items-center gap-1.5 shadow-lg ${
            requested
              ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-default'
              : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white shadow-emerald-950/20'
          }`}
        >
          {requested ? (
            <>
              <Check size={14} /> Requested
            </>
          ) : requesting ? (
            'Submitting Request...'
          ) : (
            'Request Access'
          )}
        </button>
      )}

      {/* Upgrade Checkout Modal */}
      {showUpgradeModal && selectedTargetPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-100 shadow-2xl p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-start relative max-h-[95vh] overflow-y-auto text-slate-800">
            
            {/* Close Button */}
            <button 
              onClick={() => {
                setShowUpgradeModal(false);
                setSelectedTargetPlan(null);
                setUpgradePreview(null);
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-655 hover:bg-slate-50 rounded-full transition"
            >
              <Check className="rotate-45" size={18} />
            </button>

            {/* Left side: select billing cycle */}
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-black text-slate-900">Upgrade to {selectedTargetPlan.name}</h4>
                <p className="text-xs text-slate-500 mt-1">Select your preferred billing cycle to apply prorated credits.</p>
              </div>

              {/* Cycle selection toggle */}
              <div className="flex p-1 rounded-xl bg-slate-100 text-[10px] font-bold text-slate-600 gap-1 w-fit">
                {['monthly', 'yearly'].map((cycle) => (
                  <button 
                    key={cycle}
                    type="button"
                    onClick={() => handlePreviewUpgradeForCycle(cycle)}
                    className={`px-3 py-1.5 rounded-lg transition uppercase ${
                      targetBillingCycle === cycle ? 'bg-white text-slate-950 font-black shadow-sm' : 'hover:bg-white/50'
                    }`}
                  >
                    {cycle}
                  </button>
                ))}
              </div>

              {/* Core Limits Summary */}
              <div className="space-y-3 bg-indigo-50/30 border border-indigo-50/50 p-4 rounded-2xl">
                <p className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">Plan Highlights</p>
                <div className="space-y-2 text-xs font-semibold text-slate-600">
                  <p>✓ Premium clinic features unlocked immediately</p>
                  <p>✓ Prorated credit applied automatically from remaining period</p>
                  <p>✓ Cloud backup & HIPAA data isolation included</p>
                </div>
              </div>
            </div>

            {/* Right side: prorated math and checkout form */}
            <div className="bg-slate-50 p-6 rounded-3xl space-y-6 border border-slate-100">
              <p className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Upgrade checkout summary</p>

              {loadingPreview && (
                <div className="flex justify-center p-4 text-slate-400 gap-2 items-center text-xs">
                  <RefreshCw size={14} className="animate-spin text-indigo-600" />
                  <span>Calculating prorated discount...</span>
                </div>
              )}

              {upgradePreview && (
                <div className="space-y-4">
                  
                  {/* Prorated breakdown */}
                  <div className="space-y-2 text-xs border-b border-slate-200 pb-4">
                    <div className="flex justify-between items-center text-slate-500 font-semibold">
                      <span>New Plan Price</span>
                      <span className="font-bold text-slate-800">₹{upgradePreview.selectedPlanPrice}</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-600 font-semibold">
                      <span>Unused Credit (Prorated)</span>
                      <span className="font-black">- ₹{upgradePreview.currentPlanCredit}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500 font-semibold">
                      <span>Credit Applied</span>
                      <span className="font-bold text-slate-800">₹{upgradePreview.creditApplied}</span>
                    </div>
                    <div className="h-px bg-slate-200 my-1" />
                    <div className="flex justify-between items-center font-black text-slate-900 text-sm pt-1">
                      <span>Final Payable Amount</span>
                      <span className="text-indigo-600">₹{upgradePreview.finalPayableAmount}</span>
                    </div>
                  </div>

                  {/* Payment form */}
                  <form onSubmit={handleConfirmUpgrade} className="space-y-3.5">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Debit / Credit card</p>
                    
                    <label className="grid gap-1.5 text-[10px] font-bold text-slate-700">
                      Cardholder Name
                      <input 
                        type="text" 
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="John Doe"
                        className="rounded-xl border border-slate-200 p-3 text-xs bg-white focus:border-indigo-500 outline-none transition"
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
                        className="rounded-xl border border-slate-200 p-3 text-xs bg-white focus:border-indigo-500 outline-none transition"
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
                          className="rounded-xl border border-slate-200 p-3 text-xs bg-white focus:border-indigo-500 outline-none transition"
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
                          className="rounded-xl border border-slate-200 p-3 text-xs bg-white focus:border-indigo-500 outline-none transition"
                          required
                        />
                      </label>
                    </div>

                    <button 
                      type="submit"
                      disabled={processingPayment}
                      className="w-full py-3 bg-indigo-650 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow"
                    >
                      {processingPayment ? (
                        <span>Processing payment...</span>
                      ) : (
                        <span>Pay & Upgrade Now</span>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default PremiumFeaturePlaceholder;
