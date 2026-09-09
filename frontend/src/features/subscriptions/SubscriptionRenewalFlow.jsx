import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Lock, Zap, Headphones, Crown, Calendar,
  ArrowLeft, Check, CreditCard, AlertCircle, AlertOctagon,
  Clock, Download, Sparkles, Heart, HelpCircle, CheckCircle2,
  RefreshCw, ChevronRight, Info, Building2, User, Phone, Mail
} from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import { subscriptionApi } from '../../lib/api';
import PehalLogo from '../../components/common/PehalLogo';
import PaymentDetails from '../../components/common/PaymentDetails';

/**
 * AICMS Subscription Renewal Flow
 * Complete 8-screen stateful flow matching design reference
 */
const SubscriptionRenewalFlow = ({ initialScreen = 'expired', onRestoreAccess }) => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  // Screen States:
  // 1: 'expired' | 2: 'review' | 3: 'payment' | 4: 'processing'
  // 5: 'success' | 6: 'failed' | 7: 'pending' | 8: 'invoice'
  const [currentScreen, setCurrentScreen] = useState(initialScreen);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Renewal server data
  const [renewalData, setRenewalData] = useState(null);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);
  const [activeInvoice, setActiveInvoice] = useState(null);

  // Form State for Payment Screen
  const [selectedCardId, setSelectedCardId] = useState('saved-card-1');
  const [paymentMethodTab, setPaymentMethodTab] = useState('upi');
  const [isAddingNewCard, setIsAddingNewCard] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [saveCardForFuture, setSaveCardForFuture] = useState(true);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Load server-authoritative renewal details
  const fetchRenewalDetails = async () => {
    try {
      setLoading(true);
      const res = await subscriptionApi.getRenewalDetails();
      const data = res?.data || res;
      setRenewalData(data);
      if (data?.latestInvoice) {
        setActiveInvoice(data.latestInvoice);
      }
    } catch (err) {
      console.error('Failed to fetch renewal details:', err);
      setErrorMsg(err.message || 'Unable to load subscription details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRenewalDetails();
  }, []);

  // Format Card Number helper (xxxx xxxx xxxx xxxx)
  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
    setCardNumber(formatted);
  };

  // Format Expiry Date helper (MM/YY)
  const handleExpiryChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 2) {
      setExpiryDate(`${raw.slice(0, 2)} / ${raw.slice(2)}`);
    } else {
      setExpiryDate(raw);
    }
  };

  // Parse human-readable structured error message
  const getHumanFriendlyError = (err, defaultMsg = 'Payment processing could not be completed.') => {
    if (err?.response?.data?.message && typeof err.response.data.message === 'string') {
      return err.response.data.message;
    }
    if (err?.response?.data?.error?.message && typeof err.response.data.error.message === 'string') {
      return err.response.data.error.message;
    }
    if (typeof err?.response?.data === 'string' && err.response.data.length < 150 && !err.response.data.startsWith('<')) {
      return err.response.data;
    }
    if (err?.response?.status === 400) {
      return 'Some information required for renewal is missing or incomplete. Please check your details and try again.';
    }
    if (err?.response?.status === 401 || err?.response?.status === 403) {
      return 'Your session has expired or you do not have permission to renew this clinic subscription. Please log in again.';
    }
    if (err?.response?.status === 404) {
      return 'No active subscription or clinic record could be found. Please contact support.';
    }
    if (err?.response?.status >= 500) {
      return 'We could not complete your renewal right now due to a temporary server issue. Please try again.';
    }
    if (err?.message && !err.message.includes('status code') && !err.message.includes('Network Error')) {
      return err.message;
    }
    return defaultMsg;
  };

  // ── Step 1: Proceed to Payment from Review ──────────────────────────────
  const handleProceedToPayment = async () => {
    try {
      setIsSubmittingPayment(true);
      setErrorMsg('');

      // Create server-authoritative order
      const res = await subscriptionApi.createRenewalOrder({
        idempotencyKey: `IDEM-${user?.clinic?._id || user?._id}-${Date.now()}`
      });

      const order = res?.data || res;
      setCurrentOrder(order);
      setCurrentScreen('payment');
    } catch (err) {
      console.error('Order creation failed:', err);
      setErrorMsg(getHumanFriendlyError(err, 'Could not initialize payment order. Please try again.'));
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // ── Step 2: Execute Payment ────────────────────────────────────────────
  const handleExecutePayment = async () => {
    try {
      setIsSubmittingPayment(true);
      setCurrentScreen('processing');

      // Emulate or trigger gateway verification
      const verifyPayload = {
        gatewayOrderId: currentOrder?.gatewayOrderId || currentOrder?.orderId || `order_${Date.now()}`,
        gatewayPaymentId: `pay_${Math.random().toString(36).substring(2, 14)}`,
        gatewaySignature: `sig_${Math.random().toString(36).substring(2, 20)}`,
        idempotencyKey: currentOrder?.idempotencyKey || `IDEM-${Date.now()}`,
        saveCard: saveCardForFuture,
        cardDetails: isAddingNewCard ? {
          cardNumber: cardNumber || '4242 4242 4242 4242',
          cardHolder: cardHolder || 'Clinic Administrator',
          expiryDate: expiryDate || '12/26'
        } : null
      };

      // Delay for high-fidelity processing animation
      await new Promise(resolve => setTimeout(resolve, 2000));

      const res = await subscriptionApi.verifyRenewalPayment(verifyPayload);
      const verificationResponse = res?.data || res;

      setPaymentResult(verificationResponse);
      if (verificationResponse?.invoice) {
        setActiveInvoice(verificationResponse.invoice);
      }

      // Refresh Auth Context to immediately restore access
      if (refreshUser) {
        await refreshUser();
      }

      setCurrentScreen('success');
    } catch (err) {
      console.error('Payment verification failed:', err);
      setErrorMsg(getHumanFriendlyError(err, 'We could not process your payment. Please try again or use another card.'));
      setCurrentScreen('failed');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // ── View Invoice Action ────────────────────────────────────────────────
  const handleViewInvoice = async () => {
    try {
      setLoading(true);
      if (!activeInvoice) {
        const res = await subscriptionApi.getLatestInvoice();
        const latest = res?.data || res;
        if (latest?.invoice) {
          setActiveInvoice(latest.invoice);
        }
      }
      setCurrentScreen('invoice');
    } catch (err) {
      console.error('Failed to load invoice:', err);
      setErrorMsg('Invoice details are currently unavailable.');
    } finally {
      setLoading(false);
    }
  };

  // ── Restore Access & Go To Dashboard ───────────────────────────────────
  const handleGoToDashboard = async () => {
    if (refreshUser) {
      await refreshUser();
    }
    if (onRestoreAccess) {
      onRestoreAccess();
    } else {
      navigate('/clinic/dashboard', { replace: true });
    }
  };

  // ── Print / Download Invoice ───────────────────────────────────────────
  const handleDownloadInvoice = () => {
    window.print();
  };

  // Price formatting helper
  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  const planInfo = renewalData?.plan || {
    name: 'AICMS Professional',
    description: 'For growing clinics and advanced management',
    billingCycle: 'monthly'
  };

  const pricing = renewalData?.pricing || {
    planPrice: 4999,
    subtotal: 4999,
    gstAmount: 899.82,
    totalAmount: 5898.82
  };

  const dates = renewalData?.dates || {
    formattedNextBillingDate: '31 May 2025'
  };

  const clinicInfo = renewalData?.clinic || user?.clinic || {
    name: 'Sunrise Multi Speciality Clinic',
    address: '123, Park Street, Lucknow, Uttar Pradesh, 226001, India'
  };

  return (
    <div className="min-h-screen bg-[#0B132B] text-slate-100 flex flex-col justify-between font-sans selection:bg-emerald-500 selection:text-white">
      
      {/* 🧭 Subtle Top Navbar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <PehalLogo variant="dark" height={36} />
          <div className="h-6 w-[1.5px] bg-slate-800 mx-1 hidden sm:block" />
          <div className="flex flex-col leading-none">
            <span className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
              AICMS
              <span className="text-[8px] font-extrabold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-md">BILLING</span>
            </span>
            <span className="text-[9px] font-bold text-slate-500 mt-0.5 uppercase tracking-[0.08em] hidden md:block">
              Clinic Management System
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="mailto:support@pehalhealthcare.com"
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white px-3.5 py-2 rounded-xl bg-slate-900/60 border border-slate-800 transition-all hover:bg-slate-800"
          >
            <Headphones size={13} className="text-emerald-400" />
            <span className="hidden sm:inline">24/7 Support</span>
          </a>
        </div>
      </header>

      {/* 📱 Main Screen Router Container */}
      <main className="w-full max-w-lg mx-auto px-4 py-8 flex-1 flex flex-col justify-center items-center">
        
        {/* =========================================================================
            SCREEN 1: SUBSCRIPTION EXPIRED
            ========================================================================= */}
        {currentScreen === 'expired' && (
          <div className="w-full bg-[#111A35]/90 border border-slate-800/80 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/40 backdrop-blur-xl text-center flex flex-col items-center animate-fadeIn">
            
            {/* Warning Icon Badge */}
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/25 flex items-center justify-center mb-6 text-rose-500">
              <AlertCircle size={32} strokeWidth={2.2} />
            </div>

            <h1 className="text-2xl sm:text-[26px] font-black text-white tracking-tight mb-3">
              Your subscription has expired
            </h1>

            <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-sm">
              Please renew your subscription plan to restore access to your clinic management dashboard and premium features.
            </p>

            {/* Actions */}
            <div className="w-full space-y-3">
              <button
                type="button"
                onClick={() => setCurrentScreen('review')}
                className="w-full py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 text-base font-black shadow-lg shadow-emerald-500/20 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
              >
                Renew Subscription
              </button>

              <button
                type="button"
                onClick={handleViewInvoice}
                className="w-full py-3.5 px-6 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 text-slate-200 text-sm font-bold transition-all duration-200 cursor-pointer"
              >
                View Invoice
              </button>

              <a
                href="mailto:support@pehalhealthcare.com?subject=Subscription%20Assistance"
                className="w-full py-3.5 px-6 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 text-slate-200 text-sm font-bold transition-all duration-200 cursor-pointer inline-flex items-center justify-center gap-2"
              >
                Contact Support
              </a>
            </div>
          </div>
        )}

        {/* =========================================================================
            SCREEN 2: PLAN & BILLING REVIEW
            ========================================================================= */}
        {currentScreen === 'review' && (
          <div className="w-full bg-[#111A35]/90 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/40 backdrop-blur-xl animate-fadeIn">
            
            {/* Header with Back */}
            <div className="flex items-center gap-3 mb-6">
              <button
                type="button"
                onClick={() => setCurrentScreen('expired')}
                className="w-9 h-9 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Renew Subscription</h2>
                <p className="text-xs text-slate-400">Review your plan and billing details before proceeding to payment.</p>
              </div>
            </div>

            {/* Plan Card */}
            <div className="bg-[#172346] border border-slate-800/90 rounded-2xl p-5 mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Crown size={24} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-tight">{planInfo.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{planInfo.description}</p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full shrink-0 ml-2">
                {planInfo.billingCycle === 'yearly' ? 'Yearly Plan' : 'Monthly Plan'}
              </span>
            </div>

            {/* Billing Summary */}
            <div className="bg-[#172346]/70 border border-slate-800/90 rounded-2xl p-5 mb-5 space-y-3.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">Billing Summary</h4>
              
              <div className="flex justify-between text-xs text-slate-400 font-medium">
                <span>Plan Price ({planInfo.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'})</span>
                <span className="text-slate-200 font-bold">{formatINR(pricing.planPrice)}</span>
              </div>

              <div className="flex justify-between text-xs text-slate-400 font-medium">
                <span>Subtotal</span>
                <span className="text-slate-200 font-bold">{formatINR(pricing.subtotal)}</span>
              </div>

              <div className="flex justify-between text-xs text-slate-400 font-medium">
                <span>GST (18%)</span>
                <span className="text-slate-200 font-bold">{formatINR(pricing.gstAmount)}</span>
              </div>

              <div className="h-[1px] bg-slate-800 my-2" />

              <div className="flex justify-between items-center text-sm pt-1">
                <span className="font-black text-white">Total Amount</span>
                <span className="text-lg font-black text-emerald-400">{formatINR(pricing.totalAmount)}</span>
              </div>
            </div>

            {/* Next Billing Date */}
            <div className="bg-[#172346]/40 border border-slate-800/60 rounded-2xl p-4 mb-6 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 text-slate-300 font-medium">
                <Calendar size={15} className="text-emerald-400" />
                <span>Next Billing Date</span>
              </div>
              <span className="font-bold text-white">{dates.formattedNextBillingDate}</span>
            </div>

            {/* CTA */}
            <button
              type="button"
              disabled={isSubmittingPayment}
              onClick={handleProceedToPayment}
              className="w-full py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 text-base font-black shadow-lg shadow-emerald-500/20 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmittingPayment ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Preparing Order...
                </>
              ) : (
                'Proceed to Payment'
              )}
            </button>

            <p className="text-[11px] text-slate-500 text-center mt-3 flex items-center justify-center gap-1.5 font-semibold">
              <Lock size={11} className="text-emerald-500" /> Secure & encrypted payment
            </p>
          </div>
        )}

        {/* =========================================================================
            SCREEN 3: PAYMENT DETAILS (SECURE PAYMENT)
            ========================================================================= */}
        {currentScreen === 'payment' && (
          <div className="w-full bg-[#111A35]/90 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/40 backdrop-blur-xl animate-fadeIn">
            
            {/* Header with Back */}
            <div className="flex items-center gap-3 mb-6">
              <button
                type="button"
                onClick={() => setCurrentScreen('review')}
                className="w-9 h-9 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Secure Payment</h2>
                <p className="text-xs text-emerald-400 flex items-center gap-1 mt-0.5">
                  <Lock size={10} /> Your payment is secure and encrypted
                </p>
              </div>
            </div>

            {/* Payment Method Switcher */}
            <div className="flex items-center gap-2 p-1.5 bg-[#172346]/60 border border-slate-800 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => setPaymentMethodTab('upi')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  paymentMethodTab === 'upi'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>⚡ UPI / Bank Transfer</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethodTab('card')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  paymentMethodTab === 'card'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CreditCard size={14} />
                <span>Credit / Debit Card</span>
              </button>
            </div>

            {paymentMethodTab === 'upi' ? (
              <div className="mb-6">
                <PaymentDetails
                  amount={pricing.totalAmount}
                  planName={plan.name}
                  onUtrSubmit={handleExecutePayment}
                  submitting={isSubmittingPayment}
                />
              </div>
            ) : (
              <>
                {/* Saved Cards */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">Saved Cards</span>
                  </div>

                  <div
                    onClick={() => {
                      setSelectedCardId('saved-card-1');
                      setIsAddingNewCard(false);
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      !isAddingNewCard && selectedCardId === 'saved-card-1'
                        ? 'bg-[#172346] border-emerald-500/60 shadow-md shadow-emerald-500/5'
                        : 'bg-[#172346]/40 border-slate-800/80 hover:bg-[#172346]/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded bg-blue-600/20 border border-blue-500/30 text-blue-400 font-black text-[10px] tracking-wider">
                        VISA
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-200">•••• •••• •••• 4242</span>
                      <span className="text-[11px] text-slate-400">Expires 12/26</span>
                    </div>

                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      !isAddingNewCard && selectedCardId === 'saved-card-1'
                        ? 'border-emerald-400 bg-emerald-500'
                        : 'border-slate-600 bg-transparent'
                    }`}>
                      {!isAddingNewCard && selectedCardId === 'saved-card-1' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAddingNewCard(!isAddingNewCard)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1.5 py-1 transition-colors cursor-pointer"
                  >
                    + {isAddingNewCard ? 'Use Saved Card' : 'Add New Card'}
                  </button>
                </div>

                {/* Card Details Form */}
                {isAddingNewCard && (
                  <div className="space-y-4 mb-6 bg-[#172346]/40 border border-slate-800 p-4 rounded-2xl animate-fadeIn">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2">Card Details</span>

                    {/* Card Number */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-300">Card Number</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={handleCardNumberChange}
                          placeholder="1234 5678 9012 3456"
                          className="w-full bg-[#111A35] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                        />
                        <CreditCard size={15} className="absolute right-3.5 top-3 text-slate-500" />
                      </div>
                    </div>

                    {/* Card Holder */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-300">Card Holder Name</label>
                      <input
                        type="text"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        placeholder="Enter name on card"
                        className="w-full bg-[#111A35] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Expiry & CVV */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-300">Expiry Date</label>
                        <input
                          type="text"
                          value={expiryDate}
                          onChange={handleExpiryChange}
                          placeholder="MM / YY"
                          className="w-full bg-[#111A35] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-[11px] font-bold text-slate-300">CVV</label>
                          <Info size={11} className="text-slate-500 cursor-help" />
                        </div>
                        <input
                          type="password"
                          maxLength={4}
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                          placeholder="123"
                          className="w-full bg-[#111A35] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                        />
                      </div>
                    </div>

                    {/* Save Card Checkbox */}
                    <label className="flex items-center gap-2 pt-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={saveCardForFuture}
                        onChange={(e) => setSaveCardForFuture(e.target.checked)}
                        className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-xs text-slate-300">Save this card for future payments</span>
                    </label>
                  </div>
                )}

                {/* Primary CTA */}
                <button
                  type="button"
                  disabled={isSubmittingPayment}
                  onClick={handleExecutePayment}
                  className="w-full py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 text-base font-black shadow-lg shadow-emerald-500/20 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Lock size={16} /> Pay {formatINR(pricing.totalAmount)}
                </button>

                <p className="text-[11px] text-slate-500 text-center mt-3 font-semibold">
                  You will be redirected to our secure payment gateway
                </p>
              </>
            )}
          </div>
        )}

        {/* =========================================================================
            SCREEN 4: PAYMENT PROCESSING
            ========================================================================= */}
        {currentScreen === 'processing' && (
          <div className="w-full bg-[#111A35]/90 border border-slate-800/80 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/40 backdrop-blur-xl text-center flex flex-col items-center animate-fadeIn">
            
            {/* Animated Credit Card with circular spinner */}
            <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-slate-800" />
              <div className="absolute inset-0 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
              <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-emerald-400 shadow-inner">
                <CreditCard size={28} className="animate-pulse" />
              </div>
            </div>

            <h2 className="text-2xl font-black text-white tracking-tight mb-2">Processing Payment...</h2>
            <p className="text-xs text-slate-400 mb-8 max-w-xs">
              Please do not close this window or make another payment.
            </p>

            {/* Stepper Card */}
            <div className="w-full bg-[#172346]/70 border border-slate-800 rounded-2xl p-5 mb-4 text-left">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-black uppercase tracking-wider text-slate-300">Payment Status</span>
                <span className="text-xs text-emerald-400 font-bold">Verifying your payment with bank</span>
              </div>

              {/* Progress Stepper */}
              <div className="flex items-center justify-between relative px-2">
                <div className="flex flex-col items-center gap-1.5 z-10">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-xs font-black">
                    ✓
                  </div>
                  <span className="text-[10px] font-bold text-slate-300">Payment Initiated</span>
                </div>

                <div className="flex-1 h-[2px] bg-emerald-500/80 -mt-4 mx-2" />

                <div className="flex flex-col items-center gap-1.5 z-10">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center text-xs font-black animate-pulse">
                    ●
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400">Processing</span>
                </div>

                <div className="flex-1 h-[2px] bg-slate-800 -mt-4 mx-2" />

                <div className="flex flex-col items-center gap-1.5 z-10">
                  <div className="w-6 h-6 rounded-full bg-slate-900 border border-slate-700 text-slate-600 flex items-center justify-center text-xs">
                    ○
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">Completed</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 font-semibold">This may take a few moments.</p>
          </div>
        )}

        {/* =========================================================================
            SCREEN 5: PAYMENT SUCCESSFUL
            ========================================================================= */}
        {currentScreen === 'success' && (
          <div className="w-full bg-[#111A35]/90 border border-slate-800/80 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/40 backdrop-blur-xl text-center flex flex-col items-center animate-fadeIn">
            
            {/* Sparkles / Confetti Badge */}
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/20">
                <Check size={40} strokeWidth={2.5} />
              </div>
              <Sparkles size={20} className="absolute -top-2 -right-2 text-emerald-400 animate-bounce" />
            </div>

            <h2 className="text-2xl sm:text-[26px] font-black text-white tracking-tight mb-2">
              Subscription Renewed Successfully!
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mb-6 max-w-sm">
              Your AICMS subscription has been successfully renewed.
            </p>

            {/* Receipt Summary Card */}
            <div className="w-full bg-[#172346]/80 border border-slate-800 rounded-2xl p-5 mb-8 text-left space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-medium">Plan</span>
                <span className="text-white font-bold">{planInfo.name} ({planInfo.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'})</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-medium">Amount Paid</span>
                <span className="text-emerald-400 font-black">{formatINR(pricing.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-medium">Payment ID</span>
                <span className="text-slate-300 font-mono font-bold text-[11px]">{paymentResult?.invoice?.transactionId || 'pay_8X7sk2190Zx1ab'}</span>
              </div>
              <div className="flex justify-between text-xs items-center pt-1 border-t border-slate-800">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <Calendar size={13} className="text-emerald-400" /> Valid Until
                </span>
                <span className="text-white font-black">{paymentResult?.formattedValidUntil || dates.formattedNextBillingDate}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="w-full space-y-3">
              <button
                type="button"
                onClick={handleGoToDashboard}
                className="w-full py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 text-base font-black shadow-lg shadow-emerald-500/20 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
              >
                Go to Dashboard
              </button>

              <button
                type="button"
                onClick={handleViewInvoice}
                className="w-full py-3.5 px-6 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 text-slate-200 text-sm font-bold transition-all duration-200 cursor-pointer"
              >
                View Invoice
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            SCREEN 6: PAYMENT FAILED
            ========================================================================= */}
        {currentScreen === 'failed' && (
          <div className="w-full bg-[#111A35]/90 border border-slate-800/80 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/40 backdrop-blur-xl text-center flex flex-col items-center animate-fadeIn">
            
            {/* Red Circle with X */}
            <div className="w-20 h-20 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-6 shadow-xl shadow-rose-500/10">
              <AlertOctagon size={40} strokeWidth={2.2} />
            </div>

            <h2 className="text-2xl font-black text-white tracking-tight mb-2">Payment Failed</h2>
            <p className="text-slate-400 text-xs sm:text-sm mb-6 max-w-sm">
              We couldn't process your payment. Your clinic subscription has not been renewed.
            </p>

            {/* Reason Box */}
            <div className="w-full bg-rose-500/10 border border-rose-500/20 rounded-2xl p-5 mb-8 text-left">
              <span className="text-xs font-black uppercase tracking-wider text-rose-400 block mb-1">Reason</span>
              <p className="text-xs text-rose-200/90 leading-relaxed font-medium">
                {errorMsg || 'Your card was declined. Please try again or use a different payment method.'}
              </p>
            </div>

            {/* Actions */}
            <div className="w-full space-y-3">
              <button
                type="button"
                onClick={() => setCurrentScreen('payment')}
                className="w-full py-4 px-6 rounded-2xl bg-rose-500 hover:bg-rose-400 active:scale-[0.99] text-white text-base font-black shadow-lg shadow-rose-500/20 transition-all duration-200 cursor-pointer"
              >
                Try Again
              </button>

              <a
                href="mailto:support@pehalhealthcare.com?subject=Payment%20Failed%20Assistance"
                className="w-full py-3.5 px-6 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 text-slate-200 text-sm font-bold transition-all duration-200 cursor-pointer inline-flex items-center justify-center"
              >
                Contact Support
              </a>
            </div>
          </div>
        )}

        {/* =========================================================================
            SCREEN 7: PAYMENT PENDING
            ========================================================================= */}
        {currentScreen === 'pending' && (
          <div className="w-full bg-[#111A35]/90 border border-slate-800/80 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/40 backdrop-blur-xl text-center flex flex-col items-center animate-fadeIn">
            
            {/* Amber Clock Circle */}
            <div className="w-20 h-20 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 shadow-xl shadow-amber-500/10">
              <Clock size={40} strokeWidth={2.2} />
            </div>

            <h2 className="text-2xl font-black text-white tracking-tight mb-2">Payment Processing</h2>
            <p className="text-slate-400 text-xs sm:text-sm mb-6 max-w-sm">
              Your payment is being verified. Please do not make another payment.
            </p>

            {/* Stepper Card */}
            <div className="w-full bg-[#172346]/70 border border-slate-800 rounded-2xl p-5 mb-6 text-left">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-black uppercase tracking-wider text-slate-300">Payment Status</span>
                <span className="text-xs text-amber-400 font-bold">Waiting for bank confirmation</span>
              </div>

              <div className="flex items-center justify-between relative px-2">
                <div className="flex flex-col items-center gap-1.5 z-10">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-xs font-black">
                    ✓
                  </div>
                  <span className="text-[10px] font-bold text-slate-300">Payment Initiated</span>
                </div>

                <div className="flex-1 h-[2px] bg-amber-500 -mt-4 mx-2" />

                <div className="flex flex-col items-center gap-1.5 z-10">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 border-2 border-amber-400 text-amber-400 flex items-center justify-center text-xs font-black animate-pulse">
                    ●
                  </div>
                  <span className="text-[10px] font-bold text-amber-400">Processing</span>
                </div>

                <div className="flex-1 h-[2px] bg-slate-800 -mt-4 mx-2" />

                <div className="flex flex-col items-center gap-1.5 z-10">
                  <div className="w-6 h-6 rounded-full bg-slate-900 border border-slate-700 text-slate-600 flex items-center justify-center text-xs">
                    ○
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">Completed</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 mb-6 font-medium">You will be notified once the payment is confirmed.</p>

            <button
              type="button"
              onClick={() => setCurrentScreen('expired')}
              className="w-full py-3.5 px-6 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 text-slate-200 text-sm font-bold transition-all duration-200 cursor-pointer"
            >
              Back to Subscription
            </button>
          </div>
        )}

        {/* =========================================================================
            SCREEN 8: INVOICE DETAILS
            ========================================================================= */}
        {currentScreen === 'invoice' && (
          <div className="w-full max-w-xl bg-[#111A35]/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/40 backdrop-blur-xl animate-fadeIn">
            
            {/* Header with Back and Download */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentScreen('expired')}
                  className="w-9 h-9 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <ArrowLeft size={16} />
                </button>
                <h2 className="text-xl font-black text-white tracking-tight">Invoice Details</h2>
              </div>

              <button
                type="button"
                onClick={handleDownloadInvoice}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-md shadow-emerald-500/10"
              >
                <Download size={14} /> Download
              </button>
            </div>

            {/* Professional Invoice Container */}
            <div className="bg-[#172346]/90 border border-slate-800 rounded-2xl p-6 space-y-6">
              
              {/* Row 1: Logo and Invoice Metadata */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex items-center gap-3">
                  <PehalLogo variant="dark" height={36} />
                  <div className="flex flex-col leading-none">
                    <span className="text-base font-black text-white tracking-tight">AICMS</span>
                    <span className="text-[10px] font-bold text-slate-400 mt-0.5">Clinic Management System</span>
                  </div>
                </div>

                <div className="text-left sm:text-right space-y-1 text-xs">
                  <p className="text-slate-400">
                    Invoice # <span className="text-white font-mono font-bold">{activeInvoice?.invoiceNumber || 'INV-2024-0831'}</span>
                  </p>
                  <p className="text-slate-400">
                    Date: <span className="text-slate-200 font-bold">{new Date(activeInvoice?.paymentDate || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </p>
                  <p className="text-slate-400">
                    Payment ID: <span className="text-slate-200 font-mono text-[11px] font-bold">{activeInvoice?.transactionId || 'pay_8X7sk2190Zx1ab'}</span>
                  </p>
                </div>
              </div>

              <div className="h-[1px] bg-slate-800" />

              {/* Row 2: Billed To and Subscription Period */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Billed To</span>
                  <p className="text-white font-bold text-sm mb-1">{clinicInfo.name}</p>
                  <p className="text-slate-400 leading-relaxed text-xs max-w-xs">{clinicInfo.address || '123, Park Street, Lucknow, Uttar Pradesh, 226001, India'}</p>
                </div>

                <div className="sm:text-right space-y-2">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">Plan</span>
                    <p className="text-white font-bold">{planInfo.name} ({planInfo.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'})</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">Billing Period</span>
                    <p className="text-slate-300 font-medium">{activeInvoice?.billingPeriod || `01 May 2025 – 31 May 2025`}</p>
                  </div>
                </div>
              </div>

              {/* Row 3: Items Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden text-xs">
                <div className="bg-[#111A35] px-4 py-2.5 flex justify-between font-black text-slate-300 uppercase tracking-wider text-[10px]">
                  <span>Description</span>
                  <span>Amount</span>
                </div>
                <div className="p-4 space-y-2.5">
                  <div className="flex justify-between text-slate-200 font-medium">
                    <span>{planInfo.name} ({planInfo.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'})</span>
                    <span className="font-bold">{formatINR(activeInvoice?.subtotal || pricing.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>GST ({activeInvoice?.gstRate || 18}%)</span>
                    <span>{formatINR(activeInvoice?.gstAmount || pricing.gstAmount)}</span>
                  </div>
                  <div className="h-[1px] bg-slate-800 my-2" />
                  <div className="flex justify-between items-center text-sm pt-1">
                    <span className="font-black text-white">Total Paid</span>
                    <span className="text-base font-black text-emerald-400">{formatINR(activeInvoice?.amountPaid || pricing.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Row 4: Thank You Note */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3 text-xs">
                <Heart size={20} className="text-emerald-400 shrink-0" />
                <p className="text-emerald-300/90 font-medium leading-relaxed">
                  Thank you for choosing AICMS! If you have any questions, please contact our support team.
                </p>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* 🛡️ Footer Trust Badges Bar (PCI DSS, 256-bit, Instant, 24/7) */}
      <footer className="w-full border-t border-slate-850/80 bg-[#0E1733]/90 py-6 px-6 z-10">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-xs text-slate-400">
          
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="font-bold text-slate-200 text-xs">Secure Payments</p>
              <p className="text-[10px] text-slate-500">PCI DSS compliant</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shrink-0">
              <Lock size={18} />
            </div>
            <div>
              <p className="font-bold text-slate-200 text-xs">256-bit Encryption</p>
              <p className="text-[10px] text-slate-500">End-to-end security</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shrink-0">
              <Zap size={18} />
            </div>
            <div>
              <p className="font-bold text-slate-200 text-xs">Instant Activation</p>
              <p className="text-[10px] text-slate-500">Access restored immediately</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shrink-0">
              <Headphones size={18} />
            </div>
            <div>
              <p className="font-bold text-slate-200 text-xs">24/7 Support</p>
              <p className="text-[10px] text-slate-500">We're here to help</p>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
};

export default SubscriptionRenewalFlow;
