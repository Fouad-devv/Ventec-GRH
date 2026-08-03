import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdHistory, MdStar, MdPeople, MdCheckCircle, MdRefresh } from 'react-icons/md';
import { usePageActions } from '../../context/HeaderContext';
import useAxiosPrivate from '../../api/useAxiosPrivate';
import { postingsApi } from '../../api/postings';

const ScoreChip = ({ value }) => {
  if (value == null) return <span className="text-slate-400 text-xs">—</span>;
  const n = Number(value);
  const cls = n >= 70
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
    : n >= 40
    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
    : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300';
  return (
    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      <MdStar className="w-3 h-3" />{n.toFixed(0)}/100
    </span>
  );
};

export const HistoryPage = () => {
  const axios = useAxiosPrivate();
  const navigate = useNavigate();
  const api = postingsApi(axios);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.getHistory()
      .then((r) => setHistory(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  usePageActions(
    <button onClick={load} className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
      <MdRefresh className="w-4 h-4" /><span className="hidden sm:inline">Actualiser</span>
    </button>
  );

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-12 h-12 rounded-full border-4 border-blue-100 dark:border-blue-900 border-t-blue-600 animate-spin" />
    </div>
  );

  if (history.length === 0) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
      <MdHistory className="w-12 h-12 opacity-30" />
      <p className="text-sm">Aucune offre clôturée pour l'instant</p>
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: 'Offres clôturées',   value: history.length,                                          icon: MdHistory,     bar: 'bg-slate-400 dark:bg-slate-500',   accent: 'text-slate-400 dark:text-slate-500' },
          { label: 'Total candidatures', value: history.reduce((s, h) => s + h.totalApplications, 0),   icon: MdPeople,      bar: 'bg-blue-500',                       accent: 'text-blue-400' },
          { label: 'Total embauchés',    value: history.reduce((s, h) => s + h.hiredCount, 0),          icon: MdCheckCircle, bar: 'bg-emerald-500',                    accent: 'text-emerald-400' },
        ].map(({ label, value, icon: Icon, bar, accent }) => (
          <div key={label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className={`h-1 ${bar}`} />
            <div className="p-3 sm:p-4 flex items-start justify-between gap-1">
              <div className="min-w-0">
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-none">{value}</p>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-tight">{label}</p>
              </div>
              <Icon className={`w-5 h-5 sm:w-7 sm:h-7 shrink-0 mt-0.5 ${accent} opacity-30`} />
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="text-left px-5 py-3 font-medium text-slate-600 dark:text-slate-400">Offre</th>
              <th className="text-left px-5 py-3 font-medium text-slate-600 dark:text-slate-400">Département</th>
              <th className="text-left px-5 py-3 font-medium text-slate-600 dark:text-slate-400">Contrat</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Candidatures</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Embauchés</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Score IA moy.</th>
              <th className="text-left px-5 py-3 font-medium text-slate-600 dark:text-slate-400">Clôturée le</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {history.map((h) => (
              <tr
                key={h.id}
                onClick={() => navigate(`/app/postings/${h.id}`)}
                className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <td className="px-5 py-3.5">
                  <p className="font-semibold text-slate-900 dark:text-white">{h.title}</p>
                  {h.createdByName && (
                    <p className="text-xs text-slate-400 mt-0.5">{h.createdByName}</p>
                  )}
                </td>
                <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">{h.department || '—'}</td>
                <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">{h.contractType || '—'}</td>
                <td className="px-4 py-3.5 text-center">
                  <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                    <MdPeople className="w-4 h-4 text-blue-400" />{h.totalApplications}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-center">
                  <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-medium">
                    <MdCheckCircle className="w-4 h-4" />{h.hiredCount}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-center">
                  <ScoreChip value={h.avgAiScore} />
                </td>
                <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-xs">
                  {h.closedAt ? new Date(h.closedAt).toLocaleDateString('fr-FR') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};
