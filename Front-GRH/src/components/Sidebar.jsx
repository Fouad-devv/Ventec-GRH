import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  MdDashboard,
  MdWork,
  MdPeople,
  MdAccountTree,
  MdFolder,
  MdNotifications,
  MdAdminPanelSettings,
  MdLogout,
  MdClose,
  MdKeyboardArrowDown,
  MdHistory,
  MdEventNote,
  MdLock,
} from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import { ChangePasswordModal } from './ChangePasswordModal';

const navItems = [
  { to: '/app/dashboard', icon: MdDashboard, label: 'Tableau de bord' },
  { to: '/app/postings', icon: MdWork, label: "Offres d'emploi" },
  { to: '/app/history', icon: MdHistory, label: 'Offres clôturées' },
  { to: '/app/candidates', icon: MdPeople, label: 'Candidats' },
  { to: '/app/pipeline', icon: MdAccountTree, label: 'Pipeline' },
  { to: '/app/interviews', icon: MdEventNote, label: 'Entretiens' },
  { to: '/app/documents', icon: MdFolder, label: 'Documents' },
  { to: '/app/notifications', icon: MdNotifications, label: 'Notifications' },
];

const adminItems = [
  { to: '/app/admin', icon: MdAdminPanelSettings, label: 'Administration' },
];

export const Sidebar = ({ expanded, isLarge, onClose, onExpand }) => {
  const { logout, userInfo, hasRole } = useAuth();
  const isAdmin = hasRole('ADMIN');
  const initial = userInfo?.given_name?.[0] || userInfo?.preferred_username?.[0] || '?';
  const displayRole = hasRole('ADMIN') ? 'Admin' : 'RH';

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    if (expanded) { setShowUserMenu(false); setTooltip(null); }
  }, [expanded]);

  const showTip = (e, label) => {
    if (expanded) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTooltip({ label, top: r.top + r.height / 2 });
  };
  const hideTip = () => setTooltip(null);

  const labelClass = `whitespace-nowrap transition-opacity duration-200 ${
    expanded ? 'opacity-100' : 'opacity-0'
  }`;

  const handleNavClick = () => {
    if (!isLarge) onClose?.();
  };

  return (
    <aside
      className={`flex flex-col h-screen shrink-0 bg-white dark:bg-[#090c15] border-r border-slate-200/80 dark:border-white/[0.05] shadow-[2px_0_24px_rgba(0,0,0,0.05)] dark:shadow-none transition-[width] duration-300 ease-in-out overflow-hidden ${
        isLarge
          ? `sticky top-0 z-40 ${expanded ? 'w-64' : 'w-16'}`
          : `fixed inset-y-0 left-0 z-50 ${expanded ? 'w-64' : 'w-0'}`
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 h-14 sm:h-16 px-[14px] border-b border-slate-200/80 dark:border-white/[0.05] shrink-0">
        <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/30">
          V
        </div>
        <span className={`font-extrabold text-slate-900 dark:text-white text-base tracking-tight ${labelClass}`}>
          GRH Ventec
        </span>
        {!isLarge && (
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="ml-auto p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shrink-0"
          >
            <MdClose className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={handleNavClick}
            onMouseEnter={(e) => showTip(e, label)}
            onMouseLeave={hideTip}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white'
              }`
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span className={labelClass}>{label}</span>
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <div className={`h-px bg-slate-200 dark:bg-white/[0.06] transition-opacity duration-200 ${expanded ? 'opacity-0' : 'opacity-100'}`} />
              <p className={`text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest -mt-px ${labelClass}`}>
                Admin
              </p>
            </div>
            {adminItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={handleNavClick}
                onMouseEnter={(e) => showTip(e, label)}
                onMouseLeave={hideTip}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className={labelClass}>{label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="relative px-2 py-3 border-t border-slate-200/80 dark:border-white/[0.05]">

        {/* Floating user card — absolute, overlays nav, no layout impact */}
        {showUserMenu && (
          <div className="absolute bottom-full left-2 right-2 mb-2 z-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-2xl overflow-hidden">
            {/* Card header */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-base font-bold shadow-md shadow-blue-500/20">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {userInfo?.name || userInfo?.preferred_username || 'Utilisateur'}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {userInfo?.email || '—'}
                </p>
              </div>
            </div>
            {/* Actions */}
            <div className="px-4 py-3 space-y-2">
              <button
                onClick={() => { setShowUserMenu(false); setShowChangePassword(true); }}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.10] rounded-xl transition-all duration-200"
              >
                <MdLock className="w-4 h-4" />
                Changer le mot de passe
              </button>
              <button
                onClick={logout}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 rounded-xl transition-all duration-200 shadow-sm shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/40 hover:scale-[1.03] active:scale-[0.97]"
              >
                <MdLogout className="w-4 h-4" />
                Déconnexion
              </button>
            </div>
          </div>
        )}

        {/* User summary row — always visible */}
        <button
          onClick={() => {
            if (!expanded) {
              onExpand?.();
              setShowUserMenu(true);
            } else {
              setShowUserMenu((v) => !v);
            }
          }}
          onMouseEnter={(e) => showTip(e, userInfo?.given_name ? `${userInfo.given_name} ${userInfo.family_name || ''}`.trim() : userInfo?.preferred_username || 'Utilisateur')}
          onMouseLeave={hideTip}
          className="flex items-center gap-2 w-full px-2 py-2 rounded-xl transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.06] cursor-pointer"
        >
          {/* Avatar */}
          <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-md shadow-blue-500/15">
            {initial}
          </div>
          <div className={`flex-1 min-w-0 overflow-hidden transition-opacity duration-200 flex flex-col items-start ${expanded ? 'opacity-100' : 'opacity-0'}`}>
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate whitespace-nowrap leading-tight">
              {userInfo?.given_name
                ? `${userInfo.given_name} ${userInfo.family_name || ''}`
                : userInfo?.preferred_username || 'Utilisateur'}
            </p>
            <span className={`mt-1 px-2 py-0.5 text-[10px] font-semibold rounded-md ${
              hasRole('ADMIN')
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                : 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300'
            }`}>
              {displayRole}
            </span>
          </div>
          {expanded && (
            <MdKeyboardArrowDown
              className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                showUserMenu ? 'rotate-180' : ''
              }`}
            />
          )}
        </button>

      </div>

      {/* Change password modal */}
      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}

      {/* Fixed tooltip — escapes overflow-hidden */}
      {tooltip && !expanded && (
        <div
          className="fixed z-[200] pointer-events-none"
          style={{ top: tooltip.top, left: 72, transform: 'translateY(-50%)' }}
        >
          <div className="relative flex items-center">
            <div className="w-0 h-0 border-y-[5px] border-y-transparent border-r-[6px] border-r-slate-900 dark:border-r-slate-700" />
            <div className="px-3 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-xs font-medium rounded-lg whitespace-nowrap shadow-xl">
              {tooltip.label}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
