import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Calendar, Pill, FlaskConical, AlertTriangle, Shield, ArrowRight, 
  Facebook, Twitter, Linkedin, Instagram, Youtube, HelpCircle, 
  MessageSquare, X, Laptop, User, Building2, Eye, Phone, Heart, Activity
} from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { getDefaultRouteForRole } from '../constants/routes';

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [showAiBubble, setShowAiBubble] = useState(true);

  const handleGetStarted = () => {
    if (isAuthenticated && user) {
      navigate(getDefaultRouteForRole(user.role));
    } else {
      navigate('/login');
    }
  };

  const scrollToFeatures = () => {
    document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Heart size={20} fill="currentColor" />
          </div>
          <span className="text-lg font-black tracking-tight text-slate-900">
            Smart Clinic <span className="text-blue-600 font-bold">Management System</span>
          </span>
        </div>

        <nav className="hidden lg:flex items-center gap-8 text-sm font-bold text-slate-600">
          <Link to="/login" className="hover:text-blue-600 transition flex items-center gap-1.5">
            <User size={16} className="text-blue-600" /> Find Doctor
          </Link>
          <Link to="/login" className="hover:text-blue-600 transition flex items-center gap-1.5">
            <Pill size={16} className="text-emerald-600" /> Order Medicine
          </Link>
          <Link to="/login" className="hover:text-blue-600 transition flex items-center gap-1.5">
            <FlaskConical size={16} className="text-purple-600" /> Lab Test
          </Link>
          <Link to="/login" className="hover:text-blue-600 transition flex items-center gap-1.5 text-rose-600">
            <AlertTriangle size={16} className="text-rose-500" /> Emergency
          </Link>
        </nav>

        <button 
          onClick={handleGetStarted}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-500/25 hover:shadow-blue-500/35 transition cursor-pointer"
        >
          {isAuthenticated ? 'Go to Dashboard' : 'Get Started'} <ArrowRight size={16} />
        </button>
      </header>

      {/* ── HERO SECTION ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Content */}
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-3 py-1 text-xs font-bold text-blue-600">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Smart Healthcare, Redefined
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 leading-tight">
            Smart Care, <br />
            <span className="text-blue-600">Simplified for You</span>
          </h1>
          <p className="text-base text-slate-500 leading-relaxed max-w-xl">
            Smart Clinic Management System is an all-in-one platform that connects patients, doctors, clinics, and hospitals in a smarter way.
          </p>

          {/* Bullet Points */}
          <div className="space-y-3.5">
            {[
              'Book appointments in seconds',
              'Order medicines & track delivery',
              'Book lab tests at home',
              'Get emergency help, anytime'
            ].map((text, idx) => (
              <div key={idx} className="flex items-center gap-3 text-sm font-bold text-slate-700">
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black shadow-sm">
                  ✓
                </div>
                <span>{text}</span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-4">
            <button 
              onClick={handleGetStarted}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition cursor-pointer"
            >
              Get Started <ArrowRight size={16} />
            </button>
            <button 
              onClick={scrollToFeatures}
              className="px-6 py-3.5 rounded-xl border-2 border-blue-100 hover:border-blue-600 text-blue-600 hover:bg-blue-50/50 text-sm font-bold transition cursor-pointer"
            >
              Explore Features
            </button>
          </div>
        </div>

        {/* Right Graphic: Connected Services Diagram with central Laptop */}
        <div className="lg:col-span-6 relative flex justify-center items-center py-10">
          <div className="relative w-80 sm:w-[500px] h-80 sm:h-[500px] flex justify-center items-center">
            
            {/* SVG Connecting Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 500 500">
              {/* Laptop position: Center (250, 250) */}
              {/* Top Node (Find Doctor): (250, 60) */}
              <line x1="250" y1="250" x2="250" y2="70" stroke="#bfdbfe" strokeWidth="2" strokeDasharray="6 6" />
              {/* Right-Top Node (Order Medicine): (410, 160) */}
              <line x1="250" y1="250" x2="410" y2="160" stroke="#bfdbfe" strokeWidth="2" strokeDasharray="6 6" />
              {/* Right-Bottom Node (Lab Test): (410, 340) */}
              <line x1="250" y1="250" x2="410" y2="340" stroke="#bfdbfe" strokeWidth="2" strokeDasharray="6 6" />
              {/* Bottom Node (Clinics & Hospitals): (250, 440) */}
              <line x1="250" y1="250" x2="250" y2="430" stroke="#bfdbfe" strokeWidth="2" strokeDasharray="6 6" />
              {/* Left-Bottom Node (Emergency): (90, 340) */}
              <line x1="250" y1="250" x2="90" y2="340" stroke="#bfdbfe" strokeWidth="2" strokeDasharray="6 6" />
              {/* Left-Top Node (Patient): (90, 160) */}
              <line x1="250" y1="250" x2="90" y2="160" stroke="#bfdbfe" strokeWidth="2" strokeDasharray="6 6" />
            </svg>

            {/* Central Laptop Hub */}
            <div className="absolute z-10 flex flex-col items-center justify-center scale-90 sm:scale-100">
              {/* Screen */}
              <div className="w-48 h-32 bg-slate-900 rounded-t-xl p-2 border-[5px] border-slate-800 shadow-2xl flex flex-col items-center justify-center relative">
                <div className="w-full h-full bg-white rounded flex flex-col items-center justify-center p-2 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1.5px,transparent_1.5px)] [background-size:10px_10px] opacity-40" />
                  
                  {/* Blue Cross Logo */}
                  <div className="relative z-10 w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md mb-1">
                    <Heart size={18} fill="currentColor" className="text-white" />
                  </div>
                  
                  <span className="relative z-10 text-[9px] font-black tracking-wider text-blue-600 uppercase">Smart Clinic</span>
                  <span className="relative z-10 text-[7px] font-bold text-slate-400 tracking-tight uppercase">Management System</span>
                </div>
              </div>
              {/* Base */}
              <div className="w-60 h-2.5 bg-slate-700 rounded-b-xl relative shadow-md">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-slate-500 rounded-b-sm" />
              </div>
            </div>

            {/* Node 1: Find Doctor (Top) */}
            <Link to="/login" className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-4 flex flex-col items-center group z-20">
              <div className="w-14 h-14 rounded-full bg-white shadow-lg flex items-center justify-center text-blue-600 border border-slate-100 group-hover:scale-110 group-hover:shadow-blue-200 transition duration-300">
                <User size={24} className="text-blue-600" />
              </div>
              <span className="text-[10px] font-black text-slate-700 mt-2 bg-white px-2 py-0.5 rounded-full shadow-sm border border-slate-100">Find Doctor</span>
            </Link>

            {/* Node 2: Order Medicine (Right Top) */}
            <Link to="/login" className="absolute top-[80px] right-2 sm:right-6 flex flex-col items-center group z-20">
              <div className="w-14 h-14 rounded-full bg-white shadow-lg flex items-center justify-center text-emerald-600 border border-slate-100 group-hover:scale-110 group-hover:shadow-emerald-200 transition duration-300">
                <Pill size={24} className="text-emerald-600" />
              </div>
              <span className="text-[10px] font-black text-slate-700 mt-2 bg-white px-2 py-0.5 rounded-full shadow-sm border border-slate-100">Order Medicine</span>
            </Link>

            {/* Node 3: Lab Test (Right Bottom) */}
            <Link to="/login" className="absolute bottom-[80px] right-2 sm:right-6 flex flex-col items-center group z-20">
              <div className="w-14 h-14 rounded-full bg-white shadow-lg flex items-center justify-center text-purple-600 border border-slate-100 group-hover:scale-110 group-hover:shadow-purple-200 transition duration-300">
                <FlaskConical size={24} className="text-purple-600" />
              </div>
              <span className="text-[10px] font-black text-slate-700 mt-2 bg-white px-2 py-0.5 rounded-full shadow-sm border border-slate-100">Lab Test</span>
            </Link>

            {/* Node 4: Clinics & Hospitals (Bottom) */}
            <Link to="/login" className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-4 flex flex-col items-center group z-20">
              <div className="w-14 h-14 rounded-full bg-white shadow-lg flex items-center justify-center text-indigo-600 border border-slate-100 group-hover:scale-110 group-hover:shadow-indigo-200 transition duration-300">
                <Building2 size={24} className="text-indigo-600" />
              </div>
              <span className="text-[10px] font-black text-slate-700 mt-2 bg-white px-2 py-0.5 rounded-full shadow-sm border border-slate-100">Clinics & Hospitals</span>
            </Link>

            {/* Node 5: Emergency (Left Bottom) */}
            <Link to="/login" className="absolute bottom-[80px] left-2 sm:left-6 flex flex-col items-center group z-20">
              <div className="w-14 h-14 rounded-full bg-white shadow-lg flex items-center justify-center text-rose-600 border border-slate-100 group-hover:scale-110 group-hover:shadow-rose-200 transition duration-300">
                <AlertTriangle size={24} className="text-rose-600" />
              </div>
              <span className="text-[10px] font-black text-slate-700 mt-2 bg-white px-2 py-0.5 rounded-full shadow-sm border border-slate-100">Emergency</span>
            </Link>

            {/* Node 6: Patient (Left Top) */}
            <Link to="/login" className="absolute top-[80px] left-2 sm:left-6 flex flex-col items-center group z-20">
              <div className="w-14 h-14 rounded-full bg-white shadow-lg flex items-center justify-center text-teal-600 border border-slate-100 group-hover:scale-110 group-hover:shadow-teal-200 transition duration-300">
                <User size={24} className="text-teal-600" />
              </div>
              <span className="text-[10px] font-black text-slate-700 mt-2 bg-white px-2 py-0.5 rounded-full shadow-sm border border-slate-100">Patient</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Floating AI Assistant Notification */}
      {showAiBubble && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white p-3.5 rounded-2xl shadow-2xl border border-slate-100">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <MessageSquare size={18} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400">AI Assistant</p>
            <p className="text-sm font-bold text-slate-800">Hi, I'm your assistance 👋</p>
          </div>
          <button 
            onClick={() => setShowAiBubble(false)}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-50 transition ml-2 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── WHY SMART CLINIC SECTION ── */}
      <section id="features-section" className="bg-white border-t border-b border-slate-100 py-16 lg:py-24 px-6">
        <div className="max-w-7xl w-full mx-auto text-center space-y-4">
          <h2 className="text-3xl font-black text-slate-900 relative inline-block pb-3">
            Why Smart Clinic?
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-blue-600 rounded" />
          </h2>
          <p className="text-sm text-slate-500 max-w-xl mx-auto pt-2">
            We simplify healthcare operations and improve patient experience with powerful, easy-to-use solutions.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 pt-12">
            {[
              {
                title: 'Easy Appointment Booking',
                desc: 'Book appointments with the best doctors near you in just a few clicks.',
                icon: <Calendar size={24} className="text-blue-600" />,
                bg: 'bg-blue-50 border-blue-100'
              },
              {
                title: 'Medicine Delivery',
                desc: 'Order medicines online and get them delivered fast at your doorstep.',
                icon: <Pill size={24} className="text-emerald-600" />,
                bg: 'bg-emerald-50 border-emerald-100'
              },
              {
                title: 'Lab Tests at Home',
                desc: 'Book lab tests with home sample collection and digital reports.',
                icon: <FlaskConical size={24} className="text-purple-600" />,
                bg: 'bg-purple-50 border-purple-100'
              },
              {
                title: '24/7 Emergency',
                desc: 'Get instant help in emergencies with our 24/7 support system.',
                icon: <AlertTriangle size={24} className="text-rose-600" />,
                bg: 'bg-rose-50 border-rose-100'
              },
              {
                title: 'Secure & Private',
                desc: 'Your health data is 100% secure and confidential with us.',
                icon: <Shield size={24} className="text-indigo-600" />,
                bg: 'bg-indigo-50 border-indigo-100'
              }
            ].map((card, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col items-center text-center space-y-4 hover:shadow-xl hover:-translate-y-1 transition duration-300">
                <div className={`w-12 h-12 rounded-2xl ${card.bg} border flex items-center justify-center shrink-0`}>
                  {card.icon}
                </div>
                <h4 className="text-sm font-black text-slate-900">{card.title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-slate-900 text-white border-t border-slate-800 py-16 px-6">
        <div className="max-w-7xl w-full mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10">
          
          {/* Logo & Description */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
                <Heart size={20} fill="currentColor" />
              </div>
              <span className="text-lg font-black tracking-tight">Smart Clinic</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              A complete solution for clinics, hospitals, and patients to manage healthcare smarter and better.
            </p>
            {/* Social Icons */}
            <div className="flex items-center gap-3.5 pt-2">
              {[
                { icon: <Facebook size={16} />, href: '#' },
                { icon: <Twitter size={16} />, href: '#' },
                { icon: <Linkedin size={16} />, href: '#' },
                { icon: <Instagram size={16} />, href: '#' },
                { icon: <Youtube size={16} />, href: '#' }
              ].map((s, idx) => (
                <a key={idx} href={s.href} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-blue-600 hover:text-white transition">
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Links Column 1: For Doctors */}
          <div className="lg:col-span-2 space-y-3">
            <h5 className="text-xs font-black uppercase tracking-wider text-slate-400">For Doctors</h5>
            <ul className="text-xs text-slate-400 space-y-2">
              <li><Link to="/login" className="hover:text-blue-400">Join as Doctor</Link></li>
              <li><Link to="/login" className="hover:text-blue-400">Doctor Dashboard</Link></li>
              <li><Link to="/login" className="hover:text-blue-400">Manage Appointments</Link></li>
              <li><Link to="/login" className="hover:text-blue-400">Patient Records</Link></li>
              <li><Link to="/login" className="hover:text-blue-400">E-Prescription</Link></li>
            </ul>
          </div>

          {/* Links Column 2: For Clinics */}
          <div className="lg:col-span-2 space-y-3">
            <h5 className="text-xs font-black uppercase tracking-wider text-slate-400">For Clinics</h5>
            <ul className="text-xs text-slate-400 space-y-2">
              <li><Link to="/login" className="hover:text-blue-400">Create Your Own Clinic</Link></li>
              <li><Link to="/login" className="hover:text-blue-400">Clinic Dashboard</Link></li>
              <li><Link to="/login" className="hover:text-blue-400">Manage Staff</Link></li>
              <li><Link to="/login" className="hover:text-blue-400">Appointments</Link></li>
              <li><Link to="/login" className="hover:text-blue-400">Billing & Invoices</Link></li>
            </ul>
          </div>

          {/* Links Column 3: For Hospitals */}
          <div className="lg:col-span-2 space-y-3">
            <h5 className="text-xs font-black uppercase tracking-wider text-slate-400">For Hospitals</h5>
            <ul className="text-xs text-slate-400 space-y-2">
              <li><Link to="/login" className="hover:text-blue-400">Hospital Management System</Link></li>
              <li><Link to="/login" className="hover:text-blue-400">Bed Management</Link></li>
              <li><Link to="/login" className="hover:text-blue-400">Department Management</Link></li>
              <li><Link to="/login" className="hover:text-blue-400">Staff Management</Link></li>
              <li><Link to="/login" className="hover:text-blue-400">Reports & Analytics</Link></li>
            </ul>
          </div>

          {/* Links Column 4: For Patients */}
          <div className="lg:col-span-2 space-y-3">
            <h5 className="text-xs font-black uppercase tracking-wider text-slate-400">For Patients</h5>
            <ul className="text-xs text-slate-400 space-y-2">
              <li><Link to="/login" className="hover:text-blue-400">Find Doctor</Link></li>
              <li><Link to="/login" className="hover:text-blue-400">Order Medicine</Link></li>
              <li><Link to="/login" className="hover:text-blue-400">Book Lab Test</Link></li>
              <li><Link to="/login" className="hover:text-blue-400">Health Records</Link></li>
              <li><Link to="/login" className="hover:text-blue-400">Emergency Support</Link></li>
            </ul>
          </div>
        </div>

        {/* Legal & Copyright */}
        <div className="max-w-7xl w-full mx-auto border-t border-slate-800 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-slate-500 font-bold">
          <span>&copy; 2026 Smart Clinic Management System. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-white">Privacy Policy</a>
            <a href="#" className="hover:text-white">Terms & Conditions</a>
            <a href="#" className="hover:text-white">Contact Us</a>
            <a href="#" className="hover:text-white">Help Center</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
