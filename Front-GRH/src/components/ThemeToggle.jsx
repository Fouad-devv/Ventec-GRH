import { HiSun, HiMoon } from 'react-icons/hi';
import { useTheme } from '../context/ThemeContext';

export const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();
  
  return (
    <button
      onClick={toggleTheme}
      title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      className="flex items-center justify-center w-9 h-9 rounded-full border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-all duration-200 shadow-sm"
    >
      {isDark ? <HiSun className="w-4 h-4" /> : <HiMoon className="w-4 h-4" />}
    </button>
  );
};
