import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { MdMenu, MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { Sidebar } from './Sidebar';
import { ThemeToggle } from './ThemeToggle';
import { HeaderProvider, useHeaderContext } from '../context/HeaderContext';

const getTitle = (pathname) => {
  if (pathname.startsWith('/app/dashboard'))     return 'Tableau de bord';
  if (pathname.startsWith('/app/postings'))      return "Offres d'emploi";
  if (pathname.startsWith('/app/candidates'))    return 'Candidats';
  if (pathname.startsWith('/app/pipeline'))      return 'Pipeline';
  if (pathname.startsWith('/app/documents'))     return 'Documents';
  if (pathname.startsWith('/app/notifications')) return 'Notifications';
  if (pathname.startsWith('/app/admin'))         return 'Administration';
  return '';
};

const LG = 1024;

const AppLayoutInner = ({ expanded, onToggle, onClose, onExpand, isLarge }) => {
  const { pathname } = useLocation();
  const { actions } = useHeaderContext();

  const btnLeft = expanded ? 'left-64' : 'left-16';

  return (
    <div className="relative flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Backdrop — mobile only, when sidebar is open */}
      {!isLarge && expanded && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={onToggle}
        />
      )}

      <Sidebar expanded={expanded} isLarge={isLarge} onClose={onClose} onExpand={onExpand} />

      {/* Chevron toggle — large screens only, on sidebar border */}
      {isLarge && (
        <button
          onClick={onToggle}
          aria-label="Toggle sidebar"
          className={`absolute top-7 sm:top-8 -translate-x-1/2 z-[51] w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-[left,colors] duration-300 ease-in-out ${btnLeft}`}
        >
          {expanded ? <MdChevronLeft className="w-4 h-4" /> : <MdChevronRight className="w-4 h-4" />}
        </button>
      )}

      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex items-center justify-between h-14 sm:h-16 px-3 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Hamburger — small screens only */}
            {!isLarge && (
              <button
                onClick={onToggle}
                aria-label="Open sidebar"
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              >
                <MdMenu className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-sm sm:text-base lg:text-xl font-bold text-slate-900 dark:text-white truncate">
              {getTitle(pathname)}
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
    <HeaderProvider>
      <AppLayoutInner expanded={expanded} onToggle={toggle} onClose={close} onExpand={expand} isLarge={isLarge} />
    </HeaderProvider>
  );
};
