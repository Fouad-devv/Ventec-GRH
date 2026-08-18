import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MdArrowBack, MdStar, MdSearch, MdDelete, MdWarning,
  MdPerson, MdFilterList, MdCheckCircle, MdClose, MdDownload,
} from 'react-icons/md';
import useAxiosPrivate from '../../api/useAxiosPrivate';
import { postingsApi } from '../../api/postings';
import { applicationsApi } from '../../api/applications';
import { candidatesApi } from '../../api/candidates';
import { usePageBack } from '../../context/HeaderContext';
import { useToast } from '../../context/ToastContext';

const APP_STATUS_STYLES = {
  NEW:         'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  SCREENING:   'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  SHORTLISTED: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  INTERVIEW:   'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
  HIRED:       'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  REJECTED:    'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
};

const APP_STATUS_LABELS = {
  NEW:         'Nouveau',
  SCREENING:   'En screening',
  SHORTLISTED: 'Sélectionné',
  INTERVIEW:   'Entretien',
  HIRED:       'Embauché',
  REJECTED:    'Refusé',
};

const PAGE_SIZE = 20;

// ── Score badge ────────────────────────────────────────────────────────────────

const ScoreBadge = ({ score }) => {
  if (score == null) return <span className="text-slate-400 text-sm">—</span>;
  const n = Number(score);
  const cfg = n >= 70
    ? { ring: 'ring-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950', text: 'text-emerald-700 dark:text-emerald-300' }
    : n >= 40
    ? { ring: 'ring-amber-400', bg: 'bg-amber-50 dark:bg-amber-950', text: 'text-amber-700 dark:text-amber-300' }
    : { ring: 'ring-red-400', bg: 'bg-red-50 dark:bg-red-950', text: 'text-red-700 dark:text-red-300' };
  return (
    <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl ring-2 ${cfg.ring} ${cfg.bg} shrink-0`}>
      <span className={`text-lg font-bold leading-none ${cfg.text}`}>{n.toFixed(0)}</span>
      <span className={`text-[10px] font-medium ${cfg.text} opacity-70`}>/100</span>
    </div>
  );
};

// ── Avatar ─────────────────────────────────────────────────────────────────────

const Avatar = ({ firstName, lastName, score }) => {
  const initials = `${(firstName || '?')[0]}${(lastName || '?')[0]}`.toUpperCase();
  const color = score == null
    ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
    : score >= 70
    ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
    : score >= 40
    ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'
    : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300';
  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${color}`}>
      {initials}
    </div>
  );
};

// ── Filters ────────────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { key: 'ALL',         label: 'Tous' },
  { key: 'SHORTLISTED', label: 'Sélectionnés' },
  { key: 'SCREENING',   label: 'En screening' },
  { key: 'NEW',         label: 'Nouveaux' },
  { key: 'REJECTED',    label: 'Refusés' },
];

// ── Confirm modal ──────────────────────────────────────────────────────────────

const ConfirmModal = ({ title, message, danger = true, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/[0.08] w-full max-w-sm p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${danger ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
          <MdWarning className={`w-5 h-5 ${danger ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`} />
        </div>
        <div>
          <p className="font-semibold text-slate-900 dark:text-white text-sm">{title}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{message}</p>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} disabled={loading}
          className="px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors disabled:opacity-50">
          Annuler
        </button>
        <button onClick={onConfirm} disabled={loading}
          className={`px-4 py-2 text-sm rounded-xl text-white font-medium flex items-center gap-2 transition-colors disabled:opacity-60 ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
          {loading
            ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            : <MdDelete className="w-4 h-4" />}
          Supprimer
        </button>
      </div>
    </div>
  </div>
);

// ── Page ───────────────────────────────────────────────────────────────────────

export const PostingApplicationsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const axios = useAxiosPrivate();
  const { showToast } = useToast();

  const pApi   = postingsApi(axios);
  const appApi = applicationsApi(axios);
  const cApi   = candidatesApi(axios);

  const [posting,         setPosting]         = useState(null);
  const [applications,    setApplications]    = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [search,          setSearch]          = useState('');
  const [statusFilter,    setStatusFilter]    = useState('ALL');
  const [page,            setPage]            = useState(1);
  const [deleting,        setDeleting]        = useState(false);
  const [confirmApp,      setConfirmApp]      = useState(null);
  const [updatingStatus,  setUpdatingStatus]  = useState(new Set());
  const [downloadingCv,   setDownloadingCv]   = useState(new Set());

  const handleStatusChange = async (appId, newStatus) => {
    setUpdatingStatus((prev) => new Set(prev).add(appId));
    try {
      await appApi.updateStatus(appId, { status: newStatus });
      setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, status: newStatus } : a));
    } catch {
      showToast('Erreur lors de la mise à jour du statut', 'error');
    } finally {
      setUpdatingStatus((prev) => { const s = new Set(prev); s.delete(appId); return s; });
    }
  };

  const handleDownloadCv = async (candidateId, firstName, lastName) => {
    setDownloadingCv((prev) => new Set(prev).add(candidateId));
    try {
      const res = await cApi.downloadCv(candidateId);
      const url = URL.createObjectURL(res.data);
      Object.assign(document.createElement('a'), {
        href: url,
        download: `CV-${firstName}-${lastName}.pdf`,
      }).click();
      URL.revokeObjectURL(url);
    } catch {
      showToast('CV non disponible', 'error');
    } finally {
      setDownloadingCv((prev) => { const s = new Set(prev); s.delete(candidateId); return s; });
    }
  };

  usePageBack(
    <button
      onClick={() => navigate(`/app/postings/${id}`)}
      className="flex items-center gap-1 px-2 py-1 sm:gap-1.5 sm:px-3 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
    >
      <MdArrowBack className="w-4 h-4" />
      Retour à l'offre
    </button>
  );

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([pApi.get(id), appApi.getByPosting(id)])
      .then(([p, apps]) => {
        setPosting(p.data);
        setApplications(apps.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Sort by score desc, then by name
  const sorted = useMemo(() =>
    [...applications].sort((a, b) => (b.aiScore ?? -1) - (a.aiScore ?? -1)),
    [applications],
  );

  // Apply filters (reset page on change)
  const filtered = useMemo(() => {
    let list = sorted;
    if (statusFilter !== 'ALL') list = list.filter((a) => a.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((a) =>
        `${a.candidateFirstName} ${a.candidateLastName}`.toLowerCase().includes(q),
      );
    }
    return list;
  }, [sorted, statusFilter, search]);

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const globalOffset = (page - 1) * PAGE_SIZE; // for rank display

  // Count per status
  const counts = useMemo(() => {
    const c = { ALL: applications.length, SHORTLISTED: 0, SCREENING: 0, NEW: 0, REJECTED: 0 };
    applications.forEach((a) => { if (a.status in c) c[a.status]++; });
    return c;
  }, [applications]);

  const handleDelete = async () => {
    if (!confirmApp) return;
    setDeleting(true);
    try {
      await appApi.delete(confirmApp.id);
      setApplications((prev) => prev.filter((a) => a.id !== confirmApp.id));
      setConfirmApp(null);
      showToast('Candidature retirée');
    } catch {
      showToast('Erreur lors de la suppression', 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="w-10 h-10 rounded-full border-4 border-blue-100 dark:border-blue-900 border-t-blue-600 animate-spin" />
    </div>
  );

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">

      {/* Page title + posting info */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Candidatures — {posting?.title}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {[posting?.department, posting?.location, posting?.contractType].filter(Boolean).join(' · ')}
          {' · '}
          <span className="font-medium text-slate-700 dark:text-slate-300">{applications.length} candidature{applications.length !== 1 ? 's' : ''}</span>
          {applications.some((a) => a.aiScore != null) && (
            <span className="ml-1 text-slate-400">— classées par score IA</span>
          )}
        </p>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un candidat…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <MdClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 shrink-0 flex-wrap">
          {STATUS_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === key
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {label}
              {counts[key] > 0 && (
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                  statusFilter === key
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}>
                  {counts[key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400 dark:text-slate-600">
          <MdPerson className="w-12 h-12" />
          <p className="text-sm font-medium">Aucune candidature trouvée</p>
          {(search || statusFilter !== 'ALL') && (
            <button
              onClick={() => { setSearch(''); setStatusFilter('ALL'); }}
              className="text-xs text-blue-500 hover:underline"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {paginated.map((app, idx) => {
          const rank = globalOffset + idx;
          return (
            <div
              key={app.id}
              className="bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-4 sm:p-5 hover:border-slate-300 dark:hover:border-white/[0.1] transition-colors group"
            >
              <div className="flex items-start gap-4">

                {/* Rank */}
                <div className="shrink-0 w-7 pt-1 text-right">
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-600">
                    #{rank + 1}
                  </span>
                </div>

                {/* Score circle */}
                <ScoreBadge score={app.aiScore} />

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  {/* Name + status */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar
                        firstName={app.candidateFirstName}
                        lastName={app.candidateLastName}
                        score={app.aiScore != null ? Number(app.aiScore) : null}
                      />
                      <div className="min-w-0">
                        <button
                          onClick={() => navigate(`/app/candidates/${app.candidateId}`, {
                            state: { from: `/app/postings/${id}/applications`, fromLabel: posting?.title },
                          })}
                          className="text-base font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left leading-tight"
                        >
                          {app.candidateFirstName} {app.candidateLastName}
                        </button>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          Candidature du {new Date(app.appliedAt || app.createdAt || Date.now()).toLocaleDateString('fr-FR', {
                            day: '2-digit', month: 'long', year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={app.status}
                        onChange={(e) => handleStatusChange(app.id, e.target.value)}
                        disabled={updatingStatus.has(app.id)}
                        onClick={(e) => e.stopPropagation()}
                        className={`text-xs font-semibold rounded-full px-2.5 py-1 border-0 cursor-pointer outline-none disabled:opacity-60 disabled:cursor-wait ${APP_STATUS_STYLES[app.status] ?? 'bg-slate-100 text-slate-600'}`}
                      >
                        {Object.entries(APP_STATUS_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleDownloadCv(app.candidateId, app.candidateFirstName, app.candidateLastName)}
                        disabled={downloadingCv.has(app.candidateId)}
                        className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-wait transition-all"
                        title="Télécharger le CV"
                      >
                        {downloadingCv.has(app.candidateId)
                          ? <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
                          : <MdDownload className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setConfirmApp({ id: app.id, name: `${app.candidateFirstName} ${app.candidateLastName}` })}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                        title="Retirer de l'offre"
                      >
                        <MdDelete className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* AI summary */}
                  {app.aiSummary && (
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {app.aiSummary}
                    </p>
                  )}

                  {!app.aiSummary && app.status === 'NEW' && (
                    <p className="mt-3 text-xs text-slate-400 dark:text-slate-500 italic">
                      Pas encore évalué — lancez le filtre IA pour obtenir un score.
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {filtered.length} candidature{filtered.length !== 1 ? 's' : ''} — page {page} sur {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >«</button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >‹</button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                  .reduce((acc, p, i, arr) => {
                    if (i > 0 && p - arr[i - 1] > 1) acc.push('…');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === '…' ? (
                      <span key={`e${i}`} className="px-2 py-1.5 text-xs text-slate-400">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`min-w-[2rem] px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                          p === page
                            ? 'bg-blue-600 border-blue-600 text-white font-semibold'
                            : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >{p}</button>
                    ),
                  )}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >›</button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >»</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirm delete */}
      {confirmApp && (
        <ConfirmModal
          title="Retirer le candidat ?"
          message={`La candidature de "${confirmApp.name}" pour ce poste sera supprimée. Le profil candidat restera dans le système.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmApp(null)}
          loading={deleting}
        />
      )}

    </div>
  );
};
