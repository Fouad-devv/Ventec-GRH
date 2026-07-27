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

export const Sidebar = () => {
  const { logout, userInfo, hasRole } = useAuth();
  const isAdmin = hasRole('ADMIN');
  const initial = userInfo?.given_name?.[0] || userInfo?.preferred_username?.[0] || '?';

  return (
    <aside className="group/sidebar flex flex-col w-16 lg:w-64 hover:w-64 h-screen shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-[width] duration-300 ease-in-out overflow-hidden z-40">

      {/* Logo */}
      <div className="flex items-center gap-3 px-[14px] py-5 border-b border-slate-200 dark:border-slate-800">
        <div className="w-9 h-9 shrink-0 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
          V
        </div>
        <span className="whitespace-nowrap font-bold text-slate-900 dark:text-white text-lg opacity-0 group-hover/sidebar:opacity-100 lg:opacity-100 transition-opacity duration-200">
          GRH Ventec
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span className="whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 lg:opacity-100 transition-opacity duration-200">
              {label}
            </span>
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="pt-3 pb-1 px-3">
              {/* Divider line shown when collapsed, text label when expanded */}
              <div className="h-px bg-slate-200 dark:bg-slate-700 opacity-100 group-hover/sidebar:opacity-0 lg:opacity-0 transition-opacity duration-200" />
              <p className="whitespace-nowrap text-xs font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-wider opacity-0 group-hover/sidebar:opacity-100 lg:opacity-100 transition-opacity duration-200 -mt-px">
                Admin
              </p>
            </div>
            {adminItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 lg:opacity-100 transition-opacity duration-200">
                  {label}
                </span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-2 py-4 border-t border-slate-200 dark:border-slate-800 space-y-2">

        {/* User info row */}
        <div className="flex items-center gap-2 px-2">
          <div className="w-8 h-8 shrink-0 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
            {initial}
          </div>
          <div className="flex-1 min-w-0 overflow-hidden opacity-0 group-hover/sidebar:opacity-100 lg:opacity-100 transition-opacity duration-200">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate whitespace-nowrap">
              {userInfo?.name || userInfo?.preferred_username || 'Utilisateur'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate whitespace-nowrap">
              {userInfo?.email || ''}
            </p>
          </div>
        {/* Logout */}
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
        >
          <MdLogout className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 lg:opacity-100 transition-opacity duration-200">
            Déconnexion
          </span>
        </button>
      </div>
    </aside>
  );
};
