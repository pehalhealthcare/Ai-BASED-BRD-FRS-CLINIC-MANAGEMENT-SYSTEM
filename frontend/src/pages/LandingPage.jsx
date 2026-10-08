import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

// Landing Page Components
import Header from '../components/landing/Header';
import HeroSection from '../components/landing/HeroSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import HowItWorksSection from '../components/landing/HowItWorksSection';
import RoleConnectedSection from '../components/landing/RoleConnectedSection';
import AiClinicSection from '../components/landing/AiClinicSection';
import EcosystemSection from '../components/landing/EcosystemSection';
import SolutionsSection from '../components/landing/SolutionsSection';
import CTASection from '../components/landing/CTASection';
import Footer from '../components/landing/Footer';
import VideoModal from '../components/landing/VideoModal';
import FloatingWhatsApp from '../components/common/FloatingWhatsApp';

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

  // Smooth Navigation and Section Scrolling Handler
  const handleNavClick = useCallback((e, sectionId, href) => {
    if (e && e.preventDefault) e.preventDefault();

    setActiveSection(sectionId);
    isClickScrollingRef.current = true;

    if (href && window.history.pushState) {
      window.history.pushState(null, '', href);
    }

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
    const sections = ['hero', 'features', 'workflow', 'roles', 'ai-features', 'ecosystem', 'solutions', 'footer'];
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

      {/* ── MAIN LANDING SECTIONS (EXACT REFERENCE HIERARCHY) ── */}
      <main className="flex-1">
        {/* 1. Hero Section */}
        <HeroSection
          onSetupClinic={() => handleSetupClinicClick()}
          onWatchVideo={() => setIsVideoModalOpen(true)}
          onBookDemo={() => navigate('/book-demo')}
        />

        {/* 2. Core AICMS Features Section: Everything You Need to Run a Modern Clinic */}
        <FeaturesSection
          onExploreFeatures={() => handleNavClick(null, 'workflow', '#workflow')}
        />

        {/* 3. How AICMS Works: From Patient Arrival to Complete Care — Connected. */}
        <HowItWorksSection />

        {/* 4. One Platform — Every Role Connected */}
        <RoleConnectedSection
          onSetupClinic={() => handleSetupClinicClick()}
        />

        {/* 5. AI That Works With Your Clinic — Not Around It */}
        <AiClinicSection
          onExploreAi={() => handleNavClick(null, 'ecosystem', '#ecosystem')}
        />

        {/* 6. Complete Clinic Ecosystem */}
        <EcosystemSection
          onSetupClinic={() => handleSetupClinicClick()}
        />

        {/* 7. Solutions for Every Practice */}
        <SolutionsSection
          onSelectSolution={() => handleSetupClinicClick()}
        />

        {/* 8. Final CTA: Join AI-CMS Today */}
        <CTASection
          onSetupClinic={() => handleSetupClinicClick()}
          onViewPlans={() => navigate('/pricing')}
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

      {/* ── FLOATING WHATSAPP BUTTON ── */}
      <FloatingWhatsApp />
    </div>
  );
}
