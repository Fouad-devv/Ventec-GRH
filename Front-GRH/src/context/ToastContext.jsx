import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { MdCheckCircle, MdClose, MdError, MdInfo, MdWarning } from 'react-icons/md';

const ToastContext = createContext(null);

const CONFIGS = {
  success: {
    bar:  'bg-emerald-500',
    bg:   'bg-white dark:bg-slate-900',
    border:'border-emerald-200 dark:border-emerald-800',
    icon: MdCheckCircle,
    iconCls: 'text-emerald-500',
    text: 'text-slate-800 dark:text-slate-100',
  },
  error: {
    bar:  'bg-red-500',
    bg:   'bg-white dark:bg-slate-900',
    border:'border-red-200 dark:border-red-800',
    icon: MdError,
    iconCls: 'text-red-500',
    text: 'text-slate-800 dark:text-slate-100',
  },
  warning: {
    bar:  'bg-amber-500',
    bg:   'bg-white dark:bg-slate-900',
    border:'border-amber-200 dark:border-amber-800',
    icon: MdWarning,
    iconCls: 'text-amber-500',
    text: 'text-slate-800 dark:text-slate-100',
  },
  info: {
    bar:  'bg-blue-500',
    bg:   'bg-white dark:bg-slate-900',
    border:'border-blue-200 dark:border-blue-800',
    icon: MdInfo,
    iconCls: 'text-blue-500',
    text: 'text-slate-800 dark:text-slate-100',
  },
};

const DURATION = 4000;

const Toast = ({ id, message, type, onDismiss }) => {
  const [visible, setVisible] = useState(false);
  const cfg = CONFIGS[type] ?? CONFIGS.info;
  const Icon = cfg.icon;

  useEffect(() => {
    const enter = setTimeout(() => setVisible(true), 10);
    const auto  = setTimeout(() => handleClose(), DURATION);
    return () => { clearTimeout(enter); clearTimeout(auto); };
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onDismiss(id), 300);
  };

  return (
    <div
      className={`relative flex items-start gap-3 pl-4 pr-10 py-3.5 rounded-xl border shadow-lg min-w-[280px] max-w-xs overflow-hidden
        ${cfg.bg} ${cfg.border}
        transition-all duration-300 ease-out
        ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}
    >
      {/* Left color bar */}
      <div className={`absolute left-0 inset-y-0 w-1 rounded-l-xl ${cfg.bar}`} />

      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${cfg.iconCls}`} />
      <p className={`text-sm font-medium leading-snug ${cfg.text}`}>{message}</p>

      <button
        onClick={handleClose}
        className="absolute top-2.5 right-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
      >
        <MdClose className="w-4 h-4" />
      </button>

      {/* Auto-dismiss progress bar */}
      <div
        className={`absolute bottom-0 left-0 h-[3px] ${cfg.bar} opacity-30 rounded-full`}
        style={{ animation: `toast-shrink ${DURATION}ms linear forwards` }}
      />

      <style>{`
        @keyframes toast-shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
};

const ToastContainer = ({ toasts, onDismiss }) => (
  <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
    {toasts.map((t) => (
      <div key={t.id} className="pointer-events-auto">
        <Toast {...t} onDismiss={onDismiss} />
      </div>
    ))}
  </div>
);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
