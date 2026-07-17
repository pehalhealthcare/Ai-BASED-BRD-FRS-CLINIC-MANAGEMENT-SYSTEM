import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Heart, Building2, User, Sparkles, Shield, Cloud, 
  TrendingUp, Users, ArrowRight, Activity, Calendar, 
  FileText, Pill, FlaskConical, BarChart3, HelpCircle, Check, 
  ChevronDown, Search, LogIn, ChevronRight, CheckCircle2,
  Smartphone, CreditCard, MessageSquare, Database, X
} from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { getDefaultRouteForRole } from '../constants/routes';

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const handleGetStarted = () => {
    if (isAuthenticated && user) {
      navigate(getDefaultRouteForRole(user.role));
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans antialiased">
      
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-slate-100 px-6 py-4 md:px-12 flex items-center justify-between shadow-sm">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Heart size={20} fill="currentColor" />
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-slate-900 block leading-tight">
              AICMS
            </span>
            <span className="text-[9px] font-bold text-slate-400 block tracking-wider uppercase">
              AI Clinic Management System
            </span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="hidden lg:flex items-center gap-7 text-xs font-bold text-slate-605 text-slate-600">
          <a href="#solutions" className="hover:text-blue-600 transition flex items-center gap-1">Solutions <ChevronDown size={12} /></a>
          <a href="#features" className="hover:text-blue-600 transition">Features</a>
          <a href="#ai-modules" className="hover:text-blue-600 transition">AI Modules</a>
          <a href="#pricing" className="hover:text-blue-600 transition">Pricing</a>
          <a href="#resources" className="hover:text-blue-600 transition flex items-center gap-1">Resources <ChevronDown size={12} /></a>
          <a href="#company" className="hover:text-blue-600 transition flex items-center gap-1">Company <ChevronDown size={12} /></a>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Link 
            to="/login?type=patient" 
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-slate-700 hover:text-blue-600 text-xs font-extrabold transition cursor-pointer border border-slate-200 hover:border-blue-105 bg-white shadow-sm"
          >
            <Search size={14} className="text-slate-400" /> Find a Clinic
          </Link>
          <Link 
            to="/login?type=staff" 
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-slate-700 hover:text-blue-600 text-xs font-extrabold transition cursor-pointer border border-slate-200 hover:border-blue-105 bg-white shadow-sm"
          >
            <LogIn size={14} className="text-slate-400" /> Staff Login
          </Link>
          <Link 
            to="/set-your-clinic" 
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition cursor-pointer"
          >
            Set Up Your Clinic
          </Link>
        </div>
      </header>

      {/* ── HERO SECTION ── */}
      <section className="relative overflow-hidden bg-white pt-16 lg:pt-20 pb-20 px-6 md:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Text Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100/60 rounded-full px-4.5 py-1.5 text-[10px] font-bold text-blue-600 tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" /> Smart. Simple. AI-Powered.
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 leading-[1.12] tracking-tight">
              Run Your Clinic <br />
              <span className="text-blue-600">Smarter</span> with AI
            </h1>
            
            <p className="text-slate-500 leading-relaxed text-sm max-w-xl">
              Everything you need to manage appointments, patients, doctors, billing, pharmacy, labs and AI-powered workflows from one intelligent platform.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link 
                to="/set-your-clinic" 
                className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35 transition duration-200"
              >
                Set Up Your Clinic <ArrowRight size={14} />
              </Link>
              <Link 
                to="/login?type=patient" 
                className="flex items-center gap-2 px-6 py-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-sm transition duration-200"
              >
                <Calendar size={14} /> Book Appointment
              </Link>
            </div>

            {/* Benefit badges */}
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 pt-8 border-t border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <Sparkles size={14} />
                </div>
                <span className="font-bold text-slate-750 text-xs">AI-Powered Automation</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <Shield size={14} />
                </div>
                <span className="font-bold text-slate-750 text-xs">Secure & Cloud Based</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <Activity size={14} />
                </div>
                <span className="font-bold text-slate-750 text-xs">Easy to Use Anywhere</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <Users size={14} />
                </div>
                <span className="font-bold text-slate-750 text-xs">Loved by 500+ Clinics</span>
              </div>
            </div>
          </div>

          {/* Right Dashboard Mockup Column */}
          <div className="lg:col-span-7 relative flex justify-center items-center">
            
            {/* Visual Screen Mockup Grid */}
            <div className="relative w-full max-w-2xl aspect-[4/3] rounded-3xl bg-slate-900/5 p-2 overflow-hidden flex items-center justify-center">
              
              {/* Main Desktop Dashboard Replica */}
              <div className="w-[85%] bg-white rounded-2xl shadow-2xl border border-slate-150 flex overflow-hidden">
                {/* Mini Sidebar */}
                <div className="w-16 bg-[#0f172a] p-3 flex flex-col items-center gap-4 text-slate-400">
                  <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white font-extrabold text-xs">A</div>
                  <div className="w-6 h-6 bg-slate-800 rounded-lg flex items-center justify-center text-blue-400"><Activity size={12} /></div>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center"><Users size={12} /></div>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center"><Calendar size={12} /></div>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center"><FileText size={12} /></div>
                </div>
                {/* Mini Content */}
                <div className="flex-1 p-4 bg-[#f8fafc]">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Welcome back, Dr. Owner 👋</span>
                    <div className="w-5 h-5 rounded-full bg-slate-200"></div>
                  </div>
                  {/* Grid cards */}
                  <div className="grid grid-cols-3 gap-2.5 mb-4">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                      <span className="text-[8px] text-slate-400 font-bold block uppercase">Today's Appts</span>
                      <span className="text-base font-black text-slate-850">24</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                      <span className="text-[8px] text-slate-400 font-bold block uppercase">New Patients</span>
                      <span className="text-base font-black text-slate-855">8</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                      <span className="text-[8px] text-slate-400 font-bold block uppercase">Revenue</span>
                      <span className="text-base font-black text-slate-855">₹18,750</span>
                    </div>
                  </div>
                  {/* Assistant and graph */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                      <span className="text-[9px] font-bold text-slate-700 block">AI Assistant</span>
                      <div className="bg-blue-50/50 text-blue-700 text-[8px] p-1.5 rounded-lg border border-blue-100 mt-2 font-medium">
                        "Suggest next follow-up slot?"
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                      <span className="text-[9px] font-bold text-slate-700 block">Patient Flow</span>
                      <div className="h-10 bg-slate-50 rounded-lg flex items-end gap-1 p-1">
                        <div className="bg-blue-600 h-1/2 flex-1 rounded-sm"></div>
                        <div className="bg-blue-400 h-3/4 flex-1 rounded-sm"></div>
                        <div className="bg-blue-500 h-full flex-1 rounded-sm"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Phone Mockup Overlay */}
              <div className="absolute right-4 bottom-4 w-[28%] bg-slate-900 rounded-3xl p-1.5 shadow-2xl border-4 border-slate-800 transform rotate-2">
                <div className="aspect-[9/19] bg-white rounded-[20px] overflow-hidden flex flex-col justify-between p-2.5">
                  <div className="w-1/2 h-2.5 bg-slate-900 rounded-full mx-auto mb-2"></div>
                  <div className="flex-1 space-y-2 mt-1">
                    <div className="text-[9px] font-black text-slate-850">Book Appointment</div>
                    <div className="bg-slate-50 border border-slate-150 p-1.5 rounded-lg text-[7px] text-slate-500 leading-snug">
                      Search local doctors & clinics...
                    </div>
                    <div className="bg-blue-600 text-white rounded-lg p-2 text-center text-[7px] font-bold shadow-md cursor-pointer">
                      Confirm Booking
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-850 rounded-full w-1/3 mx-auto mt-2"></div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ── ROLE CHOOSE SECTION ── */}
      <section className="bg-slate-50 py-16 px-6 border-t border-slate-100 text-center">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-900">How would you like to use AI-CMS?</h3>
            <p className="text-slate-500 text-xs font-semibold">Select your profile to access specialized dashboards and services.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Box 1: Owner */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200/60 shadow-sm hover:shadow-lg hover:-translate-y-1 transition duration-200 flex flex-col justify-between items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
                <Building2 size={32} />
              </div>
              <div className="space-y-2 mb-6">
                <h4 className="text-lg font-bold text-slate-800">I Own a Clinic</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Digitize your clinic, manage staff, schedule appointments, and grow your medical practice.
                </p>
              </div>
              <Link 
                to="/set-your-clinic"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1"
              >
                Set Up Clinic <ChevronRight size={14} />
              </Link>
            </div>

            {/* Box 2: Staff */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200/60 shadow-sm hover:shadow-lg hover:-translate-y-1 transition duration-200 flex flex-col justify-between items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6">
                <Users size={32} />
              </div>
              <div className="space-y-2 mb-6">
                <h4 className="text-lg font-bold text-slate-800">I'm a Doctor / Staff</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Log in to access your clinic appointments, consultations, electronic medical records, and pharmacy.
                </p>
              </div>
              <Link 
                to="/login?type=staff"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1"
              >
                Staff Login <ChevronRight size={14} />
              </Link>
            </div>

            {/* Box 3: Patient */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200/60 shadow-sm hover:shadow-lg hover:-translate-y-1 transition duration-200 flex flex-col justify-between items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-6">
                <User size={32} />
              </div>
              <div className="space-y-2 mb-6">
                <h4 className="text-lg font-bold text-slate-800">I'm a Patient</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Search nearby clinics, book appointments with top doctors, and manage your health records.
                </p>
              </div>
              <Link 
                to="/login?type=patient"
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1"
              >
                Find a Clinic <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES SECTION ── */}
      <section id="features" className="bg-white py-20 px-6 border-t border-slate-100">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center space-y-2">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3.5 py-1.5 rounded-full">System Capabilities</span>
            <h2 className="text-2xl font-black text-slate-900 pt-2">Powerful Features Built for Modern Clinics</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'AI Appointment Scheduling', desc: 'Reduce no-shows and optimize calendar flows with automated smart scheduling.', icon: <Calendar size={18} />, color: 'text-blue-600 bg-blue-50' },
              { title: 'Digital EMR & Patient Records', desc: 'Securely manage medical records, consult histories, and patient timelines.', icon: <FileText size={18} />, color: 'text-emerald-600 bg-emerald-50' },
              { title: 'Billing & Invoicing', desc: 'Generate paperless invoices and support integrated multi-channel payments.', icon: <CreditCard size={18} />, color: 'text-purple-600 bg-purple-50' },
              { title: 'Pharmacy & Inventory', desc: 'Track medicines, trigger reorder alerts, and manage stock.', icon: <Pill size={18} />, color: 'text-amber-600 bg-amber-50' },
              { title: 'Lab Management & Reports', desc: 'Order tests and deliver structured lab results straight to patients.', icon: <FlaskConical size={18} />, color: 'text-indigo-600 bg-indigo-50' },
              { title: 'WhatsApp Integration', desc: 'Keep patients updated with automated reminders via WhatsApp.', icon: <MessageSquare size={18} />, color: 'text-teal-600 bg-teal-50' },
              { title: 'AI Consultation Assistant', desc: 'Translate voice prescriptions to clinical records automatically.', icon: <Sparkles size={18} />, color: 'text-rose-600 bg-rose-50' },
              { title: 'Cloud Backup & Security', desc: 'Keep data secure and accessible from anywhere with robust encryption.', icon: <Database size={18} />, color: 'text-slate-650 bg-slate-100' }
            ].map((feature, idx) => (
              <div key={idx} className="bg-white rounded-3xl p-6 border border-slate-150 hover:shadow-md transition duration-200 flex flex-col gap-4">
                <div className={`w-10 h-10 rounded-xl ${feature.color} flex items-center justify-center shrink-0`}>
                  {feature.icon}
                </div>
                <h4 className="text-xs font-extrabold text-slate-800 leading-snug">{feature.title}</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── STATS SECTION ── */}
      <section className="bg-slate-50 py-16 px-6 border-t border-b border-slate-100 text-center">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-1">
              <div className="text-3xl font-black text-blue-600">500+</div>
              <p className="text-xs font-semibold text-slate-400">Clinics Onboarded</p>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-black text-blue-600">50K+</div>
              <p className="text-xs font-semibold text-slate-400">Patients Managed</p>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-black text-blue-600">120+</div>
              <p className="text-xs font-semibold text-slate-400">Cities Reached</p>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-black text-blue-600">99.9%</div>
              <p className="text-xs font-semibold text-slate-400">Uptime Guarantee</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING SECTION ── */}
      <section id="pricing" className="bg-white py-20 px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-slate-900">Choose the Right Plan for Your Clinic</h2>
            <p className="text-slate-400 text-xs">Flexible plans designed to grow with your practice.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { name: 'AI Starter Clinic', desc: 'Single doctor clinic solution.', price: '₹999', users: 'Upto 2 Users' },
              { name: 'AI Professional Clinic', desc: '1-3 doctors. Best for growing clinics.', price: '₹2,499', users: 'Upto 10 Users', popular: true },
              { name: 'AI Premium Clinic', desc: 'Multi-speciality advanced solution.', price: '₹4,999', users: 'Upto 25 Users' },
              { name: 'Enterprise Clinic', desc: 'Unlimited scalability and features.', price: 'Custom', users: 'Unlimited Users', custom: true }
            ].map((plan, idx) => (
              <div 
                key={idx} 
                className={`rounded-3xl p-6 border flex flex-col justify-between text-center relative ${
                  plan.popular 
                    ? "border-blue-600 bg-blue-50/10 shadow-md" 
                    : "border-slate-200"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 mb-1">{plan.name}</h4>
                  <p className="text-[10px] text-slate-400 mb-6">{plan.desc}</p>
                  <div className="mb-4">
                    <span className="text-2xl font-black text-slate-900">{plan.price}</span>
                    {!plan.custom && <span className="text-[10px] text-slate-400">/month</span>}
                  </div>
                  <div className="inline-block px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[10px] text-slate-500 font-bold mb-6">
                    {plan.users}
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => navigate('/set-your-clinic')}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold border transition ${
                    plan.popular 
                      ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600" 
                      : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                  }`}
                >
                  {plan.custom ? "Contact Sales" : "Choose Plan"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS SECTION ── */}
      <section className="bg-slate-50 py-20 px-6 border-t border-slate-100">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-slate-900">How It Works</h2>
            <p className="text-slate-400 text-xs font-bold">Simple, transparent processes for both clinics and patients.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Owner workflow */}
            <div className="bg-white rounded-3xl p-8 border border-slate-150 shadow-sm space-y-6">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Building2 size={16} className="text-blue-600" /> For Clinic Owners
              </h4>
              <div className="grid grid-cols-5 gap-1.5 text-center">
                {[
                  { step: 'Register Clinic', icon: <Building2 size={14} /> },
                  { step: 'Choose Plan', icon: <CreditCard size={14} /> },
                  { step: 'Approval & Activation', icon: <CheckCircle2 size={14} /> },
                  { step: 'Setup Clinic', icon: <Users size={14} /> },
                  { step: 'Start Managing', icon: <Activity size={14} /> }
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-50 text-slate-500 border border-slate-100 flex items-center justify-center shrink-0">
                      {item.icon}
                    </div>
                    <span className="text-[8px] font-bold text-slate-500 leading-tight block">{item.step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Patient workflow */}
            <div className="bg-white rounded-3xl p-8 border border-slate-150 shadow-sm space-y-6">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <User size={16} className="text-purple-650 text-purple-650" /> For Patients
              </h4>
              <div className="grid grid-cols-5 gap-1.5 text-center">
                {[
                  { step: 'Search Clinic', icon: <Search size={14} /> },
                  { step: 'Book Appt', icon: <Calendar size={14} /> },
                  { step: 'Visit Doctor', icon: <Users size={14} /> },
                  { step: 'Digital Rx', icon: <FileText size={14} /> },
                  { step: 'Lab Reports', icon: <FlaskConical size={14} /> }
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-50 text-slate-500 border border-slate-100 flex items-center justify-center shrink-0">
                      {item.icon}
                    </div>
                    <span className="text-[8px] font-bold text-slate-500 leading-tight block">{item.step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── READY TO DIGITIZE SECTION ── */}
      <section className="bg-blue-600 text-white py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-xl font-black">Ready to Digitize Your Clinic?</h3>
            <p className="text-blue-100 text-xs font-semibold">Join hundreds of smart clinics using AI-CMS to deliver better care and grow their practice.</p>
          </div>
          <Link 
            to="/set-your-clinic" 
            className="px-6 py-3 bg-white text-blue-600 hover:bg-slate-50 text-xs font-bold rounded-xl transition shadow-md whitespace-nowrap"
          >
            Set Up Your Clinic Now
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#0f172a] text-slate-400 py-16 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Col 1 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-extrabold text-xs">
                <Heart size={14} fill="currentColor" />
              </div>
              <span className="text-base font-black">AICMS</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              A complete AI-powered solution to manage your clinic efficiently and deliver exceptional patient care.
            </p>
          </div>
          {/* Col 2 */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider">Solutions</h5>
            <ul className="space-y-2 text-xs">
              <li><a href="#" className="hover:text-white transition">For Clinics</a></li>
              <li><a href="#" className="hover:text-white transition">For Doctors</a></li>
              <li><a href="#" className="hover:text-white transition">For Patients</a></li>
              <li><a href="#" className="hover:text-white transition">For Labs</a></li>
            </ul>
          </div>
          {/* Col 3 */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider">Features</h5>
            <ul className="space-y-2 text-xs">
              <li><a href="#" className="hover:text-white transition">Appointments</a></li>
              <li><a href="#" className="hover:text-white transition">EMR</a></li>
              <li><a href="#" className="hover:text-white transition">Pharmacy</a></li>
              <li><a href="#" className="hover:text-white transition">Billing</a></li>
            </ul>
          </div>
          {/* Col 4 */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider">Newsletter</h5>
            <p className="text-[11px] text-slate-500 leading-relaxed">Subscribe to get updates and healthcare insights.</p>
            <div className="flex gap-2">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="bg-slate-800 border border-slate-700 text-xs px-3.5 py-2 rounded-xl text-white outline-none w-full"
              />
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition">
                Subscribe
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-slate-600 border-t border-slate-800/80 pt-8 pt-8">
          <span>&copy; 2026 AICMS. All rights reserved.</span>
          <div className="flex items-center gap-6 font-bold">
            <a href="#" className="hover:text-white transition">Privacy Policy</a>
            <a href="#" className="hover:text-white transition">Terms of Service</a>
            <a href="#" className="hover:text-white transition">Refund Policy</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
