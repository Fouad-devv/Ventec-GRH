import { useEffect, useState } from 'react';
import { MdCheckCircle, MdDoneAll, MdRefresh } from 'react-icons/md';
import { PageHeader } from '../../components/PageHeader';
import { usePageActions } from '../../context/HeaderContext';
import useAxiosPrivate from '../../api/useAxiosPrivate';
import { notificationsApi } from '../../api/notifications';

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  return `Il y a ${Math.floor(hours / 24)}j`;
};

export const NotificationsPage = () => {
  const axios = useAxiosPrivate();
  const api = notificationsApi(axios);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.getAll()
      .then((r) => setNotifications(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  usePageActions(
    <button onClick={load} className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
      <MdRefresh className="w-4 h-4" /><span className="hidden sm:inline">Actualiser</span>
    </button>
  );

  const markRead = async (id) => {
    await api.markRead(id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const markAll = async () => {
    await api.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="p-6">
      <PageHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} non lue${unread > 1 ? 's' : ''}` : 'Tout est lu'}
        action={
          unread > 0 && (
            <button onClick={markAll}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
              <MdDoneAll className="w-4 h-4" /> Tout marquer lu
            </button>
          )
        }
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 text-slate-400">Aucune notification</div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${
                n.read
                  ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900'
              }`}
            >
              <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${n.read ? 'bg-slate-300 dark:bg-slate-700' : 'bg-blue-500'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{n.title}</p>
                {n.body && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{n.body}</p>}
                <p className="text-xs text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
              </div>
              {!n.read && (
                <button onClick={() => markRead(n.id)}
                  className="flex-shrink-0 p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 rounded">
                  <MdCheckCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
