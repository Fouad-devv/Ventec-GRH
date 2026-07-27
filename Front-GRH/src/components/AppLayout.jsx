import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ThemeToggle } from './ThemeToggle';

export const AppLayout = () => (
  <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
    <Sidebar />
    <div className="flex flex-col flex-1 overflow-hidden">
      <header className="flex items-center justify-end px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <ThemeToggle />
      </header>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  </div>
);
