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
} from 'react-icons/md';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/app/dashboard', icon: MdDashboard, label: 'Tableau de bord' },
  { to: '/app/postings', icon: MdWork, label: "Offres d'emploi" },
  { to: '/app/candidates', icon: MdPeople, label: 'Candidats' },
  { to: '/app/pipeline', icon: MdAccountTree, label: 'Pipeline' },
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
  const displayRole = hasRole('ADMIN') ? 'Admin' : hasRole('MANAGER') ? 'Manager' : 'RH';

  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    if (!expanded) setShowUserMenu(false);
  }, [expanded]);

  const labelClass = `whitespace-nowrap transition-opacity duration-200 ${
    expanded ? 'opacity-100' : 'opacity-0'
  }`;

  const handleNavClick = () => {
    if (!isLarge) onClose?.();
  };

  return (
    <aside
      className={`flex flex-col h-screen shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-[width] duration-300 ease-in-out overflow-hidden ${
        isLarge
          ? `z-40 ${expanded ? 'w-64' : 'w-16'}`
          : `fixed inset-y-0 left-0 z-50 ${expanded ? 'w-64' : 'w-0'}`
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 h-14 sm:h-16 px-[14px] border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="w-9 h-9 shrink-0 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
          V
        </div>
        <span className={`font-bold text-slate-900 dark:text-white text-lg ${labelClass}`}>
          GRH Ventec
        </span>
        {!isLarge && (
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="ml-auto p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <MdClose className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={handleNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span className={labelClass}>{label}</span>
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="pt-3 pb-1 px-3">
              <div className={`h-px bg-slate-200 dark:bg-slate-700 transition-opacity duration-200 ${expanded ? 'opacity-0' : 'opacity-100'}`} />
              <p className={`text-xs font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-wider -mt-px ${labelClass}`}>
                Admin
              </p>
            </div>
            {adminItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
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
      <div className="relative px-2 py-3 border-t border-slate-200 dark:border-slate-800">

        {/* Floating user card — absolute, overlays nav, no layout impact */}
        {showUserMenu && (
          <div className="absolute bottom-full left-2 right-2 mb-2 z-10 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
            {/* Card header */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-200 dark:border-slate-700">
              <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-base font-bold shadow-sm">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {userInfo?.name || userInfo?.preferred_username || 'Utilisateur'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {userInfo?.email || '—'}
                </p>
              </div>
            </div>
            {/* Logout */}
            <div className="px-4 py-3">
              <button
                onClick={logout}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 rounded-xl transition-colors shadow-sm"
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
          className="flex items-center gap-2 w-full px-2 py-2 rounded-xl transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          {/* Avatar */}
          <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
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
                : hasRole('MANAGER')
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
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
    </aside>
  );
};
