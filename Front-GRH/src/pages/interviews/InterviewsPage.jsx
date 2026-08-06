import { useEffect, useRef, useState } from 'react';
import {
  MdClose, MdRefresh, MdSearch, MdDownload, MdAutoAwesome,
  MdEventNote, MdSchedule, MdCheckCircle, MdCancel,
} from 'react-icons/md';
import { StatusBadge } from '../../components/StatusBadge';
import { usePageActions } from '../../context/HeaderContext';
import useAxiosPrivate from '../../api/useAxiosPrivate';
import { interviewsApi } from '../../api/interviews';

// ─── helpers ────────────────────────────────────────────────────────────────

const TYPE_MAP = {
  VIDEO:   { label: 'Visio',      cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' },
  PHONE:   { label: 'Téléphone',  cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  ON_SITE: { label: 'Présentiel', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
};

const TypeBadge = ({ type }) => {
  const { label, cls } = TYPE_MAP[type] || { label: type || '—', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
};

const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} - ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// ─── Detail Modal ────────────────────────────────────────────────────────────

const InfoRow = ({ label, value, isLink }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
    {isLink ? (
      <a href={value} target="_blank" rel="noopener noreferrer"
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all">
        {value}
      </a>
    ) : (
      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{value || '—'}</span>
    )}
  </div>
);

const InterviewDetailModal = ({ interview, onClose, axios }) => {
  const iApi = interviewsApi(axios);
  const [questions, setQuestions] = useState([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    try { setQuestions(JSON.parse(interview.questions || '[]')); }
    catch { setQuestions([]); }
  }, [interview.id]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await iApi.generateQuestions(interview.id);
      try { setQuestions(JSON.parse(res.data.questions || '[]')); } catch { setQuestions([]); }
    } catch (e) { console.error(e); }
    finally { setGenerating(false); }
  };

  const exportPdf = () => {
    iApi.exportPdf(interview.id).then((r) => {
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `entretien-${interview.candidateLastName || interview.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }).catch(console.error);
  };

  const isLink = interview.locationOrLink?.startsWith('http');
  const typeLabel = (TYPE_MAP[interview.type] || {}).label || interview.type || '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="min-w-0 flex-1 pr-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {interview.candidateFirstName} {interview.candidateLastName}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {interview.jobPostingTitle || '—'}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <StatusBadge status={interview.status} />
            <button onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <MdClose className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            <InfoRow label="Date & heure" value={formatDate(interview.scheduledAt)} />
            <InfoRow label="Durée" value={`${interview.durationMinutes} minutes`} />
            <InfoRow label="Format" value={typeLabel} />
            <InfoRow
              label={isLink ? 'Lien de connexion' : 'Lieu'}
              value={interview.locationOrLink}
              isLink={isLink}
            />
            {interview.responsableNom && (
              <InfoRow label="Responsable" value={interview.responsableNom} />
            )}
            {interview.responsableEmail && (
              <InfoRow label="Email responsable" value={interview.responsableEmail} />
            )}
          </div>

          {/* Notes */}
          {interview.notes && (
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Notes</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap bg-slate-50 dark:bg-slate-800 rounded-xl p-4 leading-relaxed">
                {interview.notes}
              </p>
            </div>
          )}

          {/* AI Questions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Questions IA</p>
              <button onClick={handleGenerate} disabled={generating}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900 disabled:opacity-50 font-medium transition-colors">
                <MdAutoAwesome className="w-3.5 h-3.5" />
                {generating ? 'Génération…' : questions.length > 0 ? 'Régénérer' : 'Générer'}
              </button>
            </div>
            {questions.length === 0 ? (
              <div className="text-sm text-slate-400 text-center py-8 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                Aucune question générée
              </div>
            ) : (
              <ol className="space-y-3">
                {questions.map((q, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-xs text-slate-400 font-mono mt-0.5 shrink-0 w-5 text-right select-none">
                      {i + 1}.
                    </span>
                    <span className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {typeof q === 'string' ? q : (q.question || JSON.stringify(q))}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <button onClick={exportPdf}
            className="flex items-center gap-1.5 text-sm px-3 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <MdDownload className="w-4 h-4" /> Exporter PDF
          </button>
          <button onClick={onClose}
            className="px-5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Stat Card ───────────────────────────────────────────────────────────────

const StatCard = ({ icon: Icon, label, value, gradient, numGradient }) => (
  <div className="group relative overflow-hidden bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-transparent transition-all duration-300 cursor-default">
    <div className={`absolute inset-x-0 top-0 h-[3px] group-hover:h-[5px] bg-gradient-to-r ${gradient} transition-all duration-300`} />
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-[0.05] dark:group-hover:opacity-[0.1] transition-opacity duration-300`} />
    <div className="relative flex items-start justify-between gap-3 pt-1">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-tight">{label}</p>
        <p className={`text-3xl font-extrabold mt-1.5 leading-none tabular-nums bg-gradient-to-br ${numGradient} bg-clip-text text-transparent`}>
          {value ?? '—'}
        </p>
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br ${gradient} shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all duration-300`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  </div>
);

// ─── Main Page ───────────────────────────────────────────────────────────────

const STATUS_FILTERS = ['ALL', 'SCHEDULED', 'COMPLETED', 'CANCELLED'];
const STATUS_LABELS  = { ALL: 'Tous', SCHEDULED: 'Planifiés', COMPLETED: 'Terminés', CANCELLED: 'Annulés' };

export const InterviewsPage = () => {
  const axios = useAxiosPrivate();
  const iApi  = interviewsApi(axios);
  const loadRef = useRef(null);

  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('ALL');
  const [typeFilter, setType]       = useState('ALL');
  const [selected, setSelected]     = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await iApi.getAll();
      setInterviews(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  loadRef.current = load;
  useEffect(() => { load(); }, []);

  usePageActions(
    <button onClick={() => loadRef.current()}
      className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
      <MdRefresh className="w-4 h-4" /><span className="hidden sm:inline">Actualiser</span>
    </button>
  );

  // Stats
  const stats = [
    { icon: MdEventNote,   label: 'Total',     value: interviews.length,                                       gradient: 'from-slate-500 to-slate-700',    numGradient: 'from-slate-900 to-slate-600 dark:from-slate-200 dark:to-slate-400' },
    { icon: MdSchedule,    label: 'Planifiés', value: interviews.filter(i => i.status === 'SCHEDULED').length, gradient: 'from-blue-500 to-blue-700',       numGradient: 'from-blue-900 to-blue-600' },
    { icon: MdCheckCircle, label: 'Terminés',  value: interviews.filter(i => i.status === 'COMPLETED').length, gradient: 'from-emerald-500 to-emerald-700', numGradient: 'from-emerald-900 to-emerald-600' },
    { icon: MdCancel,      label: 'Annulés',   value: interviews.filter(i => i.status === 'CANCELLED').length, gradient: 'from-red-500 to-red-700',         numGradient: 'from-red-900 to-red-600' },
  ];

  // Filter
  const q = search.trim().toLowerCase();
  const filtered = interviews.filter((iv) => {
    if (statusFilter !== 'ALL' && iv.status !== statusFilter) return false;
    if (typeFilter   !== 'ALL' && iv.type   !== typeFilter)   return false;
    if (q) {
      const candidate = `${iv.candidateFirstName || ''} ${iv.candidateLastName || ''}`.toLowerCase();
      const posting   = (iv.jobPostingTitle  || '').toLowerCase();
      const resp      = (iv.responsableNom   || '').toLowerCase();
      if (!candidate.includes(q) && !posting.includes(q) && !resp.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6">

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-0 max-w-sm">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Candidat, offre, responsable…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
          />
        </div>

        {/* Status pills */}
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300 dark:hover:border-blue-700'
              }`}>
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Type */}
        <select value={typeFilter} onChange={(e) => setType(e.target.value)}
          className="text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
          <option value="ALL">Tous formats</option>
          <option value="VIDEO">Visio</option>
          <option value="PHONE">Téléphone</option>
          <option value="ON_SITE">Présentiel</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-24 text-slate-400 text-sm">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 text-slate-400 text-sm">
          {interviews.length === 0 ? 'Aucun entretien planifié' : 'Aucun résultat pour cette recherche'}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {['Date & Heure', 'Candidat', "Offre d'emploi", 'Format', 'Durée', 'Responsable', 'Statut', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((iv) => (
                  <tr key={iv.id} onClick={() => setSelected(iv)}
                    className="border-b border-slate-50 dark:border-slate-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{formatDate(iv.scheduledAt)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {iv.candidateFirstName} {iv.candidateLastName}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <span className="text-slate-500 dark:text-slate-400 truncate block">{iv.jobPostingTitle || '—'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <TypeBadge type={iv.type} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500 dark:text-slate-400">
                      {iv.durationMinutes} min
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700 dark:text-slate-300">{iv.responsableNom || <span className="text-slate-400">—</span>}</div>
                      {iv.responsableEmail && (
                        <div className="text-xs text-slate-400 truncate max-w-[160px]">{iv.responsableEmail}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={iv.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <button onClick={(e) => { e.stopPropagation(); setSelected(iv); }}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                        Détails →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
            {filtered.length} entretien{filtered.length !== 1 ? 's' : ''}
            {filtered.length !== interviews.length && ` sur ${interviews.length}`}
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <InterviewDetailModal interview={selected} onClose={() => setSelected(null)} axios={axios} />
      )}
    </div>
  );
};
