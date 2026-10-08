import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import Header from '../components/landing/Header';
import PricingSection from '../components/landing/PricingSection';
import CTASection from '../components/landing/CTASection';
import Footer from '../components/landing/Footer';
import FloatingWhatsApp from '../components/common/FloatingWhatsApp';

export default function PricingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const handleSetupClinicClick = useCallback((planCode = null, cycle = 'monthly') => {
    if (!isAuthenticated) {
      if (planCode) {
        navigate(`/register-clinic?plan=${planCode}&billing=${cycle}`);
      } else {
        navigate('/register-clinic');
      }
      return;
    }

    if (user?.role === 'ADMIN' && user?.clinic) {
      if (user.clinic.isOnboardingCompleted) {
        navigate('/clinic/dashboard');
      } else {
        navigate('/clinic/onboarding');
      }
    } else {
      navigate('/register-clinic');
    }
  }, [isAuthenticated, user, navigate]);

  const handleSelectPlan = useCallback((plan, billingCycle) => {
    const planCode = plan.code || plan._id;
    if (planCode === 'ENTERPRISE' || plan.priceCustom) {
      if (!isAuthenticated) {
        navigate(`/register-clinic?plan=ENTERPRISE&billing=${billingCycle}`);
      } else {
        navigate('/admin/subscriptions');
      }
      return;
    }

    handleSetupClinicClick(planCode, billingCycle);
  }, [isAuthenticated, navigate, handleSetupClinicClick]);

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans antialiased overflow-x-hidden selection:bg-blue-600 selection:text-white">
      {/* ── STICKY HEADER ── */}
      <Header
        activeSection="pricing"
        onSetupClinic={() => handleSetupClinicClick()}
        isAuthenticated={isAuthenticated}
        user={user}
      />

      {/* ── PRICING CONTENT ── */}
      <main className="flex-1 pt-20">
        <PricingSection
          onSelectPlan={handleSelectPlan}
          isAuthenticated={isAuthenticated}
        />

        <CTASection
          onSetupClinic={() => handleSetupClinicClick()}
          onViewPlans={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        />
      </main>

      {/* ── FOOTER ── */}
      <Footer />

      {/* ── FLOATING WHATSAPP BUTTON ── */}
      <FloatingWhatsApp />
    </div>
  );
}
