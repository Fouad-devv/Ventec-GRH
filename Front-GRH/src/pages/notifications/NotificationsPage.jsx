import { useEffect, useRef, useState, useMemo } from 'react';
import {
  MdAutoAwesome, MdCheckCircle, MdDoneAll, MdInbox,
  MdMail, MdNotifications, MdRefresh, MdCalendarToday,
  MdWork, MdFilterAlt,
} from 'react-icons/md';
import { PageHeader } from '../../components/PageHeader';
import { usePageActions } from '../../context/HeaderContext';
import useAxiosPrivate from '../../api/useAxiosPrivate';
import { notificationsApi } from '../../api/notifications';

/* ── helpers ──────────────────────────────────────────────────────────── */

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 1)   return "À l'instant";
  if (mins < 60)  return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days  = Math.floor(hours / 24);
  if (days < 7)   return `Il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const exactDate = (dateStr) =>
  new Date(dateStr).toLocaleString('fr-FR', {
    weekday: 'long', day: '2-digit', month: 'long',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

// Extract "Développeur Java" from "Offre : Développeur Java"
const parseOffer = (body) => {
  if (!body) return null;
  const match = body.match(/^Offre\s*:\s*(.+)$/i);
  return match ? match[1].trim() : null;
};

const TYPE_CONFIG = {
  EMAIL_SENT: {
    label: 'Email envoyé',
    icon: MdMail,
    bg: 'bg-cyan-100 dark:bg-cyan-950',
    iconCls: 'text-cyan-600 dark:text-cyan-400',
    badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
    border: 'border-l-cyan-400',
  },
  FILTER_JOB_DONE: {
    label: 'Filtrage IA',
    icon: MdAutoAwesome,
    bg: 'bg-violet-100 dark:bg-violet-950',
    iconCls: 'text-violet-600 dark:text-violet-400',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    border: 'border-l-violet-400',
  },
  DEFAULT: {
    label: 'Système',
    icon: MdNotifications,
    bg: 'bg-slate-100 dark:bg-slate-800',
    iconCls: 'text-slate-500 dark:text-slate-400',
    badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    border: 'border-l-slate-300',
  },
};
const getConfig = (type) => TYPE_CONFIG[type] ?? TYPE_CONFIG.DEFAULT;

/* ── date filter helpers ──────────────────────────────────────────────── */

const DATE_FILTERS = [
  { key: 'all',   label: 'Tout' },
  { key: 'today', label: "Aujourd'hui" },
  { key: 'week',  label: 'Cette semaine' },
  { key: 'month', label: 'Ce mois' },
];

const inDateRange = (dateStr, key) => {
  if (key === 'all') return true;
  const d   = new Date(dateStr);
  const now = new Date();
  if (key === 'today') {
    return d.toDateString() === now.toDateString();
  }
  if (key === 'week') {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return d >= startOfWeek;
  }
  if (key === 'month') {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  return true;
};

/* ── component ────────────────────────────────────────────────────────── */

export const NotificationsPage = () => {
  const axios = useAxiosPrivate();
  const api   = notificationsApi(axios);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [dateFilter, setDateFilter]   = useState('all');   // all | today | week | month
  const [offerFilter, setOfferFilter] = useState('');       // offer name or ''
  const [marking, setMarking]   = useState(null);

  const loadRef = useRef();
  const load = () => {
    setLoading(true);
    api.getAll()
      .then((r) => setNotifications(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  loadRef.current = load;
  useEffect(() => { load(); }, []);

  usePageActions(
    <button onClick={() => loadRef.current()}
      className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
      <MdRefresh className="w-4 h-4" /><span className="hidden sm:inline">Actualiser</span>
    </button>
  );

  const markRead = async (id) => {
    setMarking(id);
    try {
      await api.markRead(id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    } finally { setMarking(null); }
  };

  const markAll = async () => {
    await api.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Unique offer names from all notifications
  const offerOptions = useMemo(() => {
    const names = notifications
      .map((n) => parseOffer(n.body))
      .filter(Boolean);
    return [...new Set(names)].sort();
  }, [notifications]);

  // Apply all filters
  const filtered = useMemo(() => notifications.filter((n) => {
    if (!inDateRange(n.createdAt, dateFilter)) return false;
    if (offerFilter && parseOffer(n.body) !== offerFilter) return false;
    return true;
  }), [notifications, dateFilter, offerFilter]);

  const unread = notifications.filter((n) => !n.read).length;
  const hasActiveFilter = dateFilter !== 'all' || offerFilter !== '';

  const resetFilters = () => {
    setDateFilter('all');
    setOfferFilter('');
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <PageHeader
        title="Notifications"
        action={
          unread > 0 && (
            <button onClick={markAll}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <MdDoneAll className="w-4 h-4" /> Tout marquer lu
            </button>
          )
        }
      />

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="mb-5 space-y-3">
        {/* Row 1: date */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Date filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <MdCalendarToday className="w-3.5 h-3.5 text-slate-400 ml-1" />
            {DATE_FILTERS.map((f) => (
              <button key={f.key} onClick={() => setDateFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  dateFilter === f.key
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: offer filter + reset */}
        <div className="flex items-center gap-3">
          {offerOptions.length > 0 && (
            <div className="flex items-center gap-2 flex-1 max-w-xs">
              <MdWork className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={offerFilter}
                onChange={(e) => setOfferFilter(e.target.value)}
                className="flex-1 text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="">Toutes les offres</option>
                {offerOptions.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          )}
          {hasActiveFilter && (
            <button onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors">
              <MdFilterAlt className="w-4 h-4" /> Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* ── Notification list ────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-10 h-10 rounded-full border-4 border-blue-100 dark:border-blue-900 border-t-blue-600 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <MdInbox className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-sm font-medium">Aucune notification</p>
          {hasActiveFilter && (
            <p className="text-xs mt-1 text-slate-400">Essayez de modifier vos filtres</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const cfg   = getConfig(n.type);
            const Icon  = cfg.icon;
            const offer = parseOffer(n.body);
            const date  = new Date(n.createdAt);

            return (
              <div
                key={n.id}
                className={`group relative flex items-start gap-4 p-4 rounded-xl border-l-4 border border-slate-200 dark:border-slate-800 transition-all ${cfg.border} ${
                  n.read
                    ? 'bg-white dark:bg-slate-900'
                    : 'bg-blue-50/60 dark:bg-blue-950/20'
                }`}
              >
                {/* Unread dot */}
                {!n.read && (
                  <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-blue-500" />
                )}

                {/* Type icon */}
                <div className={`shrink-0 mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center ${cfg.bg}`}>
                  <Icon className={`w-5 h-5 ${cfg.iconCls}`} />
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0 pr-6">
                  {/* Title + badge */}
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className={`text-sm font-semibold ${n.read ? 'text-slate-700 dark:text-slate-200' : 'text-slate-900 dark:text-white'}`}>
                      {n.title}
                    </p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                  </div>

                  {/* Offer name */}
                  {offer && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <MdWork className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300 truncate">
                        {offer}
                      </span>
                    </div>
                  )}

                  {/* Non-offer body (AI filter result etc.) */}
                  {n.body && !offer && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1.5">{n.body}</p>
                  )}

                  {/* Date row */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500" title={exactDate(n.createdAt)}>
                    <MdCalendarToday className="w-3 h-3 shrink-0" />
                    <span>
                      {date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <span>
                      {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <span className="italic">{timeAgo(n.createdAt)}</span>
                  </div>
                </div>

                {/* Mark as read button */}
                {!n.read && (
                  <button
                    onClick={() => markRead(n.id)}
                    disabled={marking === n.id}
                    title="Marquer comme lu"
                    className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/40 disabled:opacity-30"
                  >
                    {marking === n.id
                      ? <div className="w-4 h-4 border-2 border-blue-400/40 border-t-blue-500 rounded-full animate-spin" />
                      : <MdCheckCircle className="w-4 h-4" />
                    }
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
