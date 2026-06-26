import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, Stethoscope, FlaskConical,
  Pill, ShieldAlert, ScrollText, Bell, ListChecks, Bot,
  LayoutGrid, UserCircle, CreditCard, ChevronRight,
  Building2, UserCog, Sun, Moon, LogOut, ClipboardList,
  Activity, Syringe, FileText, RotateCcw, HelpCircle, Headphones,
  TrendingUp
} from 'lucide-react';

import { NAV_ITEMS, ROUTES } from '../../constants/routes';
import { canAccessRole } from '../../constants/roles';
import { useTheme } from '../../context/ThemeContext';
import Avatar from '../ui/Avatar';

// Map labels to icons
const ICON_MAP = {
  'Super Admin Dashboard': <Activity size={18} />,
  'My Doctors': <UserCog size={18} />,
  'My Receptionists': <UserCog size={18} />,
  'Clinic Settings': <Building2 size={18} />,
  'Doctor Leaves Review': <Calendar size={18} />,
  'My Leaves': <Calendar size={18} />,
  'Earnings': <TrendingUp size={18} />,
  'Dashboard': <LayoutDashboard size={18} />,
  'Patients': <Users size={18} />,
  'Appointments': <Calendar size={18} />,
  'Consultations': <Stethoscope size={18} />,
  'Labs': <FlaskConical size={18} />,
  'Lab Tests': <FlaskConical size={18} />,
  'Pharmacy': <Pill size={18} />,
  'Pharmacy Store': <Pill size={18} />,
  'Billing Risk': <ShieldAlert size={18} />,
  'Audit Logs': <ScrollText size={18} />,
  'Notifications': <Bell size={18} />,
  'Follow-ups': <ListChecks size={18} />,
  'AI Chatbot': <Bot size={18} />,
  'My Portal': <LayoutGrid size={18} />,
  'My Appointments': <Calendar size={18} />,
  'Reschedule Appointment': <RotateCcw size={18} />,
  'View Clinic & Details': <Building2 size={18} />,
  'Medical History': <ClipboardList size={18} />,
  'Prescriptions & Records': <FileText size={18} />,
  'Billing & Invoices': <CreditCard size={18} />,
  'Users': <UserCircle size={18} />,
  'Prescriptions': <ClipboardList size={18} />,
  'Billing': <CreditCard size={18} />,
};

// Patient-specific navigation with sections
const PATIENT_NAV = [
  { label: 'My Portal', path: ROUTES.portal, iconKey: 'My Portal' },
  { label: 'Lab Tests', path: ROUTES.labTests, iconKey: 'Lab Tests' },
  { label: 'Pharmacy Store', path: ROUTES.pharmacyMedicines, iconKey: 'Pharmacy Store' },
  { type: 'section', label: 'PATIENT TOOLS' },
  { label: 'My Appointments', path: ROUTES.patientAppointments, iconKey: 'My Appointments' },
  { label: 'Reschedule Appointment', path: `${ROUTES.patientAppointments}?view=reschedule`, iconKey: 'Reschedule Appointment' },
  { label: 'View Clinic & Details', path: `${ROUTES.patientAppointments}?view=clinic`, iconKey: 'View Clinic & Details' },
];

const Sidebar = ({ role, open, onNavigate, user, onLogout }) => {
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();

  const isPendingDoctor =
    user?.role === 'DOCTOR' &&
    (['pending_profile', 'pending_approval', 're_edit'].includes(user?.approvalStatus) || !user?.hasAcceptedSlot);

  const isPendingReceptionist =
    user?.role === 'RECEPTIONIST' &&
    (['pending_profile', 'pending_approval', 're_edit'].includes(user?.approvalStatus) || !user?.hasAcceptedSlot);

  const isPatient = role === 'PATIENT';

  const visibleItems = (isPendingDoctor || isPendingReceptionist)
    ? []
    : isPatient
    ? PATIENT_NAV
    : NAV_ITEMS.filter((item) => canAccessRole(role, item.roles));

  const isItemActive = (item) => {
    if (isPatient) {
      // Exact match for pathname
      const itemUrl = new URL(item.path, window.location.origin);
      const isPathMatch = location.pathname === itemUrl.pathname;
      const itemView = itemUrl.searchParams.get('view');
      const currentView = new URLSearchParams(location.search).get('view');

      if (itemView) {
        return isPathMatch && currentView === itemView;
      }
      return isPathMatch && !currentView;
    }
    return location.pathname === item.path || location.pathname.startsWith(item.path + '/');
  };

  return (
    <>
      {/* Sidebar panel */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex flex-col w-[270px]
          bg-[#060d18] border-r border-white/[0.06]
          transition-transform duration-300 ease-spring
          lg:sticky lg:top-0 lg:h-screen lg:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Brand Header */}
        <div className="px-5 pt-6 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-aura-500 to-indigo-600 flex items-center justify-center shadow-glow-teal shrink-0">
              <Syringe size={18} className="text-white" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-aura-400">AI-CMS</p>
              <p className="text-sm font-semibold text-white leading-tight">
                {isPatient ? 'Patient Portal' : 'Clinic Workspace'}
              </p>
            </div>
          </div>

          {/* Subtle separator */}
          <div className="mt-5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {visibleItems.map((item, idx) => {
            // Render section header
            if (item.type === 'section') {
              return (
                <div key={`section-${idx}`} className="pt-5 pb-2 px-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/25 select-none">
                    {item.label}
                  </p>
                </div>
              );
            }

            const active = isItemActive(item);
            return (
              <NavLink
                key={item.path + item.label}
                to={item.path}
                onClick={onNavigate}
                className={() =>
                  `nav-item ${active ? 'active' : ''}`
                }
              >
                <span className="shrink-0 opacity-80">
                  {ICON_MAP[item.iconKey || item.label] || <ChevronRight size={16} />}
                </span>
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Patient "Need Help?" section */}
        {isPatient && (
          <div className="px-3 pb-2 shrink-0">
            <div className="rounded-2xl bg-white/[0.04] border border-white/[0.07] p-4">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-7 h-7 rounded-lg bg-aura-500/15 flex items-center justify-center shrink-0">
                  <HelpCircle size={15} className="text-aura-400" />
                </div>
                <p className="text-white text-sm font-semibold">Need Help?</p>
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed mb-3 pl-0.5">
                Talk to our support team for any queries.
              </p>
              <button className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-aura-600/20 hover:bg-aura-600/30 border border-aura-500/20 text-aura-300 text-xs font-semibold transition-all duration-150">
                <Headphones size={13} />
                Contact Support
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-3 pb-5 pt-2 shrink-0 space-y-2">
          {/* Divider */}
          <div className="h-px bg-white/[0.06] mb-3" />

          {/* Dark/Light toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/[0.07] transition-all duration-150"
            aria-label="Toggle dark/light mode"
          >
            {isDark
              ? <Sun size={16} className="shrink-0 text-amber-400" />
              : <Moon size={16} className="shrink-0 text-indigo-400" />}
            <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
            <span className="ml-auto">
              <div className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors duration-200 ${isDark ? 'bg-aura-600' : 'bg-indigo-500'}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${isDark ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </span>
          </button>

          {/* User section */}
          {user && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <Avatar name={user.name} size="sm" className="shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.name || 'User'}</p>
                <p className="text-[11px] text-white/40 uppercase tracking-wide">
                  {(user.role || '').replaceAll('_', ' ')}
                </p>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-lg text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition"
                  aria-label="Logout"
                  title="Logout"
                >
                  <LogOut size={15} />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
