import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ThemeToggle } from './ThemeToggle';
import { HeaderProvider, useHeaderContext } from '../context/HeaderContext';

const getTitle = (pathname) => {
  if (pathname.startsWith('/app/dashboard'))    return 'Tableau de bord';
  if (pathname.startsWith('/app/postings'))     return "Offres d'emploi";
  if (pathname.startsWith('/app/candidates'))   return 'Candidats';
  if (pathname.startsWith('/app/pipeline'))     return 'Pipeline';
  if (pathname.startsWith('/app/documents'))    return 'Documents';
  if (pathname.startsWith('/app/notifications'))return 'Notifications';
  if (pathname.startsWith('/app/admin'))        return 'Administration';
  return '';
};

const AppLayoutInner = () => {
  const { pathname } = useLocation();
  const { actions } = useHeaderContext();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex items-center justify-between px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {getTitle(pathname)}
          </h1>
          <div className="flex items-center gap-3">
            {actions}
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export const AppLayout = () => (
  <HeaderProvider>
    <AppLayoutInner />
  </HeaderProvider>
);
