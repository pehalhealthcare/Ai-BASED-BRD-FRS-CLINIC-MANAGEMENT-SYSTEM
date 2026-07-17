import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Menu, Bell, Settings, BarChart2, User, Calendar, Search, MessageSquare, LogOut, ChevronDown, Sparkles, Shield } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { ROLES } from '../../constants/roles';
import { patientApi, apiClient } from '../../lib/api';

const Topbar = ({ title, currentUser, onToggleSidebar, onLogout }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const [patientClinics, setPatientClinics] = useState([]);
  const isPatient = currentUser?.role === ROLES.PATIENT;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [higherPlanExists, setHigherPlanExists] = useState(false);

  useEffect(() => {
    if (currentUser?.role === ROLES.ADMIN) {
      apiClient.get('/subscriptions/plans')
        .then(res => {
          const plans = res.data?.plans || res.plans || [];
          const currentPlanCode = currentUser?.clinic?.subscription?.planId?.code || 'STARTER';
          
          const PLAN_RANKS = {
            'STARTER': 1,
            'PROFESSIONAL': 2,
            'PREMIUM': 3,
            'ENTERPRISE': 4
          };
          
          const currentRank = PLAN_RANKS[currentPlanCode] || 1;
          const hasHigher = plans.some(p => {
            const rank = PLAN_RANKS[p.code] || 1;
            return rank > currentRank;
          });
          
          setHigherPlanExists(hasHigher);
        })
        .catch(() => {
          const currentPlanCode = currentUser?.clinic?.subscription?.planId?.code || 'STARTER';
          setHigherPlanExists(currentPlanCode !== 'ENTERPRISE');
        });
    } else {
      setHigherPlanExists(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isPatient) {
      patientApi.getMyClinics()
        .then(res => {
          setPatientClinics(res.data?.clinics || res.clinics || []);
        })
        .catch(() => {});
    }
  }, [isPatient]);

  const currentParams = new URLSearchParams(location.search);
  const selectedClinicId = currentParams.get('clinicId') || (patientClinics.length > 0 ? patientClinics[0]._id : '');
  const activeTab = currentParams.get('tab') || 'dashboard';

  const clinicName = currentUser?.clinic?.name || 'Sunrise Clinic';
  const activeClinicObj = patientClinics.find(c => String(c._id) === String(selectedClinicId));

  return (
    <header className="
      sticky top-0 z-30 flex items-center justify-between
      px-6 py-3 h-16
      bg-white border-b border-slate-100
      backdrop-blur-xl
    ">
      {/* Left — Burger menu + Clinic Selector */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-55 hover:text-slate-900 transition"
        >
          <Menu size={20} />
        </button>

        {/* Patient Clinic Selector Dropdown */}
        {isPatient && patientClinics.length > 0 && (
          <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden md:inline">Current Clinic</span>
            <select
              value={selectedClinicId}
              onChange={(e) => {
                const newClinicId = e.target.value;
                navigate(`/portal?tab=${activeTab}&clinicId=${newClinicId}`);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-black text-slate-700 outline-none focus:border-blue-500 transition cursor-pointer"
            >
              {patientClinics.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Clinic Selector Pill (for Admins / Staff) */}
        {!isPatient && (
          <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 shadow-sm">
            <span className="text-[10px] text-slate-400">🏥</span>
            <span className="text-xs font-bold text-slate-800">{clinicName}</span>
            <ChevronDown size={12} className="text-slate-400" />
            <span className="bg-emerald-100 text-emerald-600 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ml-1">
              Active
            </span>
          </div>
        )}
      </div>

      {/* Middle — Universal/Scoped Search Input */}
      <div className="hidden md:flex items-center gap-4 flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <input
            type="text"
            placeholder={isPatient 
              ? `Search in ${activeClinicObj?.name || 'Clinic'} (Doctors, Appointments, Reports...)`
              : "Search patients, appointments, invoices..."
            }
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition shadow-sm"
          />
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {/* Right — Actions */}
      <div className="flex items-center gap-3">
         {/* Upgrade Plan Action Button */}
        {currentUser?.role === ROLES.ADMIN && higherPlanExists && (
          <button
            onClick={() => navigate('/admin/subscription')}
            className="hidden lg:flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 border border-purple-200 hover:border-purple-300 text-purple-600 text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
          >
            <Sparkles size={13} className="text-purple-600" />
            <span>Upgrade Plan</span>
          </button>
        )}

        {/* Chat / Messages */}
        <button
          onClick={() => isPatient ? navigate('/portal?tab=support') : navigate('/chatbot')}
          aria-label="Messages"
          className="p-2 rounded-xl text-slate-400 hover:text-slate-655 hover:bg-slate-50 transition relative"
        >
          <MessageSquare size={18} />
        </button>

        {/* Notification Bell with Badge */}
        <button
          onClick={() => isPatient ? navigate('/portal?tab=notifications') : null}
          aria-label="Notifications"
          className="p-2 rounded-xl text-slate-400 hover:text-slate-655 hover:bg-slate-50 transition relative"
        >
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-[9px] font-black text-white flex items-center justify-center border border-white">
            3
          </span>
        </button>

        {/* User profile dropdown trigger */}
        {currentUser && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2.5 pl-3 border-l border-slate-100 focus:outline-none cursor-pointer group text-left"
            >
              <Avatar name={currentUser.name} src={currentUser.profileImage} size="sm" />
              <div className="hidden md:block">
                <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors leading-tight">
                  {currentUser.name || 'Patient'}
                </p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 font-mono">
                  {isPatient ? `ID: ${currentUser.patientId || 'PT123456'}` : (currentUser.role || '').replaceAll('_', ' ')}
                </p>
              </div>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-250">
                <div className="px-3 py-2 border-b border-slate-50 mb-1">
                  <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
                </div>
                
                {isPatient && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        navigate('/portal?tab=profile');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition text-left cursor-pointer"
                    >
                      <User size={15} className="text-slate-400" />
                      My Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        navigate('/portal?tab=security');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition text-left cursor-pointer"
                    >
                      <Shield size={15} className="text-slate-400" />
                      Security Settings
                    </button>
                  </>
                )}

                {currentUser.role === ROLES.ADMIN && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        navigate('/admin/clinics-dashboard');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition text-left cursor-pointer"
                    >
                      <BarChart2 size={15} className="text-slate-400" />
                      View Analytics
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        navigate('/admin/organization-settings');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition text-left cursor-pointer"
                    >
                      <Settings size={15} className="text-slate-400" />
                      Organization Settings
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition text-left mt-1 cursor-pointer"
                >
                  <LogOut size={15} />
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Topbar;
