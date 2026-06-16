import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Sun, Moon, LogOut, Bell, Settings, BarChart2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import Avatar from '../ui/Avatar';
import { ROLES } from '../../constants/roles';

const Topbar = ({ title, currentUser, onToggleSidebar, onLogout }) => {
  const { isDark, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="
      sticky top-0 z-30 flex items-center justify-between
      px-4 md:px-6 py-3 h-14
      bg-white/80 dark:bg-navy-900/80
      border-b border-slate-100 dark:border-white/[0.06]
      backdrop-blur-xl
    ">
      {/* Left — Mobile menu toggle + Page title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          className="
            lg:hidden p-2 rounded-xl
            text-slate-600 dark:text-slate-400
            hover:bg-slate-100 dark:hover:bg-white/10
            hover:text-slate-900 dark:hover:text-white
            transition
          "
        >
          <Menu size={20} />
        </button>

        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white leading-none">{title}</h2>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 uppercase tracking-wide">AI-CMS</p>
        </div>
      </div>

      {/* Right — Actions */}
      <div className="flex items-center gap-1.5">
        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="
            p-2 rounded-xl
            text-slate-500 dark:text-slate-400
            hover:text-slate-700 dark:hover:text-white
            hover:bg-slate-100 dark:hover:bg-white/10
            transition
          "
        >
          {isDark
            ? <Sun size={18} className="text-amber-400" />
            : <Moon size={18} className="text-indigo-500" />}
        </button>

        {/* Notification bell placeholder */}
        <button
          aria-label="Notifications"
          className="
            p-2 rounded-xl relative
            text-slate-500 dark:text-slate-400
            hover:text-slate-700 dark:hover:text-white
            hover:bg-slate-100 dark:hover:bg-white/10
            transition
          "
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-aura-500" />
        </button>

        {/* User info + Dropdown menu */}
        {currentUser && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 pl-1.5 ml-0.5 border-l border-slate-200 dark:border-white/10 focus:outline-none cursor-pointer group"
            >
              <Avatar name={currentUser.name} size="sm" />
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-slate-800 dark:text-white leading-none group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {currentUser.name || 'User'}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 uppercase tracking-wide">
                  {(currentUser.role || '').replaceAll('_', ' ')}
                </p>
              </div>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-navy-800 border border-stone-200 dark:border-white/[0.08] shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-3 py-2 border-b border-stone-100 dark:border-white/[0.04] mb-1">
                  <p className="text-xs font-bold text-stone-900 dark:text-white">{currentUser.name}</p>
                  <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate">{currentUser.email}</p>
                </div>
                
                {currentUser.role === ROLES.ADMIN && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        navigate('/admin/clinics-dashboard');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-white/[0.04] rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <BarChart2 size={15} className="text-stone-400 dark:text-stone-500" />
                      View Analytics
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        navigate('/admin/organization-settings');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-white/[0.04] rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <Settings size={15} className="text-stone-400 dark:text-stone-500" />
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
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors text-left mt-1 cursor-pointer"
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
