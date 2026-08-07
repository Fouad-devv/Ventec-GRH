import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { MdMenu, MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { Sidebar } from './Sidebar';
import { ThemeToggle } from './ThemeToggle';
import { HeaderProvider, useHeaderContext } from '../context/HeaderContext';
import { ToastProvider } from '../context/ToastContext';

const getTitle = (pathname) => {
  if (pathname.startsWith('/app/dashboard'))     return 'Tableau de bord';
  if (pathname.startsWith('/app/postings'))      return "Offres d'emploi";
  if (pathname.startsWith('/app/candidates'))    return 'Candidats';
  if (pathname.startsWith('/app/pipeline'))      return 'Pipeline';
  if (pathname.startsWith('/app/interviews'))    return 'Entretiens';
  if (pathname.startsWith('/app/documents'))     return 'Documents';
  if (pathname.startsWith('/app/notifications')) return 'Notifications';
  if (pathname.startsWith('/app/history'))        return 'Offres clôturées';
  if (pathname.startsWith('/app/admin'))         return 'Administration';
  return '';
};

const LG = 1024;

const AppLayoutInner = ({ expanded, onToggle, onClose, onExpand, isLarge }) => {
  const { pathname } = useLocation();
  const { actions, backButton } = useHeaderContext();

  useEffect(() => {
    const title = getTitle(pathname);
    document.title = title ? `${title} – Ventec GRH` : 'Ventec GRH';
  }, [pathname]);

  const btnLeft = expanded ? 'left-64' : 'left-16';

  return (
    <div className="relative flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Backdrop — mobile only, when sidebar is open */}
      {!isLarge && expanded && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={onToggle}
        />
      )}

      <Sidebar expanded={expanded} isLarge={isLarge} onClose={onClose} onExpand={onExpand} />

      {/* Chevron toggle — large screens only, at bottom-right corner of logo area */}
      {isLarge && (
        <button
          onClick={onToggle}
          aria-label="Toggle sidebar"
          className={`fixed top-14 sm:top-16 -translate-x-1/2 -translate-y-1/2 z-40 w-7 h-7 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-[left,colors] duration-300 ease-in-out ${btnLeft}`}
        >
          {expanded ? <MdChevronLeft className="w-5 h-5" /> : <MdChevronRight className="w-5 h-5" />}
        </button>
      )}

      <div className="flex flex-col flex-1 min-w-0">
        <header className="sticky top-0 z-30 lg:static grid grid-cols-[1fr_2fr_1fr] items-center h-14 sm:h-16 px-3 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 lg:bg-slate-50 lg:dark:bg-slate-950 lg:border-b-0">
          {/* Left — hamburger (mobile) + back button */}
          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
            {!isLarge && (
              <button
                onClick={onToggle}
                aria-label="Open sidebar"
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              >
                <MdMenu className="w-5 h-5" />
              </button>
            )}
            {backButton}
          </div>

          {/* Center — page title */}
          <div className="overflow-hidden self-center lg:self-end lg:pb-2">
            <h1 className="text-sm sm:text-lg lg:text-3xl font-semibold lg:font-extrabold lg:tracking-tight text-slate-900 dark:text-white truncate text-center">
              {getTitle(pathname)}
            </h1>
          </div>

          {/* Right — actions + theme toggle */}
          <div className="flex items-center justify-end gap-2 sm:gap-3">
            {actions}
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export const AppLayout = () => {
  const [isLarge, setIsLarge] = useState(window.innerWidth >= LG);
  const [expanded, setExpanded] = useState(() => {
    if (window.innerWidth < LG) return false;
    const saved = localStorage.getItem('sidebar-expanded');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    const onResize = () => {
      const large = window.innerWidth >= LG;
      setIsLarge(large);
      if (!large) {
        setExpanded(false);
      } else {
        const saved = localStorage.getItem('sidebar-expanded');
        setExpanded(saved !== null ? JSON.parse(saved) : true);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const toggle = () =>
    setExpanded((prev) => {
      const next = !prev;
      if (window.innerWidth >= LG) {
        localStorage.setItem('sidebar-expanded', JSON.stringify(next));
      }
      return next;
    });

  const close = () => setExpanded(false);

  const expand = () => {
    setExpanded(true);
    if (window.innerWidth >= LG) {
      localStorage.setItem('sidebar-expanded', 'true');
    }
  };

  return (
    <ToastProvider>
      <HeaderProvider>
        <AppLayoutInner expanded={expanded} onToggle={toggle} onClose={close} onExpand={expand} isLarge={isLarge} />
      </HeaderProvider>
    </ToastProvider>
  );
};
