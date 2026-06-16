import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, Stethoscope, FlaskConical,
  Pill, ShieldAlert, ScrollText, Bell, ListChecks, Bot,
  LayoutGrid, UserCircle, CreditCard, ChevronRight,
  Building2, UserCog, Sun, Moon, LogOut, ClipboardList,
  Activity, Syringe
} from 'lucide-react';

import { NAV_ITEMS } from '../../constants/routes';
import { canAccessRole } from '../../constants/roles';
import { useTheme } from '../../context/ThemeContext';
import Avatar from '../ui/Avatar';

// Map labels to icons
const ICON_MAP = {
  'Super Admin Dashboard': <Activity size={18} />,
  'My Doctors': <UserCog size={18} />,
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
  'Users': <UserCircle size={18} />,
  'Prescriptions': <ClipboardList size={18} />,
  'Billing': <CreditCard size={18} />,
};

const Sidebar = ({ role, open, onNavigate, user, onLogout }) => {
  const { isDark, toggleTheme } = useTheme();

  const isPendingDoctor =
    user?.role === 'DOCTOR' &&
    (['pending_profile', 'pending_approval', 're_edit'].includes(user?.approvalStatus) || !user?.hasAcceptedSlot);

  const visibleItems = isPendingDoctor
    ? []
    : NAV_ITEMS.filter((item) => canAccessRole(role, item.roles));

  return (
    <>
      {/* Sidebar panel */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex flex-col w-[270px]
          bg-[#060d18] border-r border-white/[0.06]
          transition-transform duration-300 ease-spring
          lg:static lg:translate-x-0
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
              <p className="text-sm font-semibold text-white leading-tight">Clinic Workspace</p>
            </div>
          </div>

          {/* Subtle separator */}
          <div className="mt-5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {visibleItems.map((item) => (
            <NavLink
              key={item.path + item.label}
              to={item.path}
              onClick={onNavigate}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
            >
              <span className="shrink-0 opacity-80">
                {ICON_MAP[item.label] || <ChevronRight size={16} />}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

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
