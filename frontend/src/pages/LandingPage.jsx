import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

// Landing Page Components
import Header from '../components/landing/Header';
import HeroSection from '../components/landing/HeroSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import ProductShowcaseSection from '../components/landing/ProductShowcaseSection';
import PricingSection from '../components/landing/PricingSection';
import SolutionsSection from '../components/landing/SolutionsSection';
import CTASection from '../components/landing/CTASection';
import Footer from '../components/landing/Footer';
import VideoModal from '../components/landing/VideoModal';

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [activeSection, setActiveSection] = useState('hero');
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const isClickScrollingRef = useRef(false);

  // Handle Primary "Setup Your Clinic" CTA
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

  // Handle Plan selection from Pricing Cards
  const handleSelectPlan = useCallback((plan, billingCycle) => {
    const planCode = plan.code || plan._id;
    if (planCode === 'ENTERPRISE' || plan.priceCustom) {
      // Enterprise inquiry or registration
      if (!isAuthenticated) {
        navigate(`/register-clinic?plan=ENTERPRISE&billing=${billingCycle}`);
      } else {
        navigate('/admin/subscriptions');
      }
      return;
    }

    handleSetupClinicClick(planCode, billingCycle);
  }, [isAuthenticated, navigate, handleSetupClinicClick]);

  // Smooth Navigation and Section Scrolling Handler
  const handleNavClick = useCallback((e, sectionId, href) => {
    if (e && e.preventDefault) e.preventDefault();

    // Always update the active section and push the hash to the URL.
    setActiveSection(sectionId);
    isClickScrollingRef.current = true;

    if (href && window.history.pushState) {
      window.history.pushState(null, '', href);
    }

    // When e is null the Header component is already handling the scroll
    // (it waits for the drawer animation to finish before scrollIntoView).
    // In that case we skip the duplicate scrollTo here to avoid a conflict.
    if (e !== null) {
      const targetElement = document.getElementById(sectionId);
      if (targetElement) {
        const headerOffset = sectionId === 'hero' ? 0 : -85;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset + headerOffset;

        window.scrollTo({
          top: Math.max(0, offsetPosition),
          behavior: 'smooth',
        });
      }
    }

    setTimeout(() => {
      isClickScrollingRef.current = false;
    }, 800);
  }, []);

  // Scroll spy to highlight active section in Navbar
  useEffect(() => {
    const sections = ['hero', 'features', 'product', 'pricing', 'solutions', 'footer'];
    const sectionElements = sections.map((id) => document.getElementById(id)).filter(Boolean);

    const observer = new IntersectionObserver(
      (entries) => {
        if (isClickScrollingRef.current) return;

        let bestSection = '';
        let maxRatio = 0;

        entries.forEach((entry) => {
          if (entry.intersectionRatio > maxRatio && entry.intersectionRatio > 0.15) {
            maxRatio = entry.intersectionRatio;
            bestSection = entry.target.id;
          }
        });

        if (bestSection) {
          setActiveSection(bestSection);
        }
      },
      {
        root: null,
        rootMargin: '-85px 0px -40% 0px',
        threshold: [0.15, 0.3, 0.6, 0.9],
      }
    );

    sectionElements.forEach((el) => observer.observe(el));

    // Handle hash on initial load
    const initialHash = window.location.hash.replace('#', '');
    if (initialHash) {
      const el = document.getElementById(initialHash);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans antialiased overflow-x-hidden selection:bg-blue-600 selection:text-white">
      {/* ── STICKY GLASS HEADER ── */}
      <Header
        activeSection={activeSection}
        onNavClick={handleNavClick}
        onSetupClinic={() => handleSetupClinicClick()}
        isAuthenticated={isAuthenticated}
        user={user}
      />

      {/* ── MAIN LANDING SECTIONS (PRECISE MASTER ORDER) ── */}
      <main className="flex-1">
        {/* 1. Hero Section */}
        <HeroSection
          onSetupClinic={() => handleSetupClinicClick()}
          onWatchVideo={() => setIsVideoModalOpen(true)}
          onBookDemo={() => navigate('/book-demo')}
        />

        {/* 2. Why AI-CMS / Features Section */}
        <FeaturesSection
          onExploreFeatures={() => handleNavClick(null, 'product', '#product')}
        />

        {/* 3. AI-CMS Product Showcase Section */}
        <ProductShowcaseSection
          onSetupClinic={() => handleSetupClinicClick()}
          onWatchVideo={() => setIsVideoModalOpen(true)}
          onBookDemo={() => navigate('/book-demo')}
          onTryAssistant={() => handleNavClick(null, 'pricing', '#pricing')}
        />

        {/* 4. Pricing Plans Section (NEW: Dynamic Plans & Billing Toggle) */}
        <PricingSection
          onSelectPlan={handleSelectPlan}
          isAuthenticated={isAuthenticated}
        />

        {/* 5. Solutions for Every Practice Section */}
        <SolutionsSection
          onSelectSolution={() => handleSetupClinicClick()}
        />

        {/* 6. Final CTA Section */}
        <CTASection
          onSetupClinic={() => handleSetupClinicClick()}
        />
      </main>

      {/* ── FOOTER ── */}
      <Footer />

      {/* ── VIDEO WALKTHROUGH MODAL ── */}
      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        onSetupClinic={() => handleSetupClinicClick()}
      />
    </div>
  );
}
