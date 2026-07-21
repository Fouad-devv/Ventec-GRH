import { SignOutButton } from '@clerk/clerk-react';
import { ThemeToggle } from '../../components/ThemeToggle';

export const Home = () => {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Home</h1>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <SignOutButton redirectUrl="/">
              <button className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors">
                Logout
              </button>
            </SignOutButton>
          </div>
        </div>
      </div>
    </div>
  );
};
