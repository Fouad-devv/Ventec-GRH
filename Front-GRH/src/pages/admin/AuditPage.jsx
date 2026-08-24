import { useEffect, useState, useCallback } from 'react';
import { MdSearch, MdFilterList, MdClearAll, MdRefresh } from 'react-icons/md';
import useAxiosPrivate from '../../api/useAxiosPrivate';
import { auditApi } from '../../api/audit';
import { usePageActions } from '../../context/HeaderContext';

/* ── Labels ───────────────────────────────────────────────── */
const ACTION_LABELS = {
  APPLICATION_STATUS_CHANGED:    'Statut candidature modifié',
  REJECTION_EMAILS_SENT:         'Emails de refus envoyés',
  INTERVIEW_NOTIFICATIONS_SENT:  'Convocations envoyées',
  CANDIDATE_CREATED:             'Candidat créé',
  CANDIDATE_UPDATED:             'Candidat modifié',
  CANDIDATE_DELETED:             'Candidat supprimé',
  CANDIDATE_CONTACTED_UPDATED:   'Contact mis à jour',
  JOB_POSTING_CREATED:           'Offre créée',
  JOB_POSTING_UPDATED:           'Offre modifiée',
  JOB_POSTING_DELETED:           'Offre supprimée',
  JOB_POSTING_CLOSED:            'Offre clôturée',
  JOB_POSTING_DUPLICATED:        'Offre dupliquée',
  FICHE_FONCTION_GENERATED:      'Fiche de fonction générée',
  INTERVIEW_SCHEDULED:           'Entretien planifié',
  INTERVIEW_UPDATED:             'Entretien modifié',
  INTERVIEW_CANCELLED:           'Entretien annulé',
};

const ENTITY_LABELS = {
  APPLICATION: 'Candidature',
  CANDIDATE:   'Candidat',
  JOB_POSTING: "Offre d'emploi",
  INTERVIEW:   'Entretien',
};

const STATUS_FR = {
  NEW:         'Nouveau',
  SHORTLISTED: 'Présélectionné',
  HIRED:       'Recruté',
  REJECTED:    'Refusé',
  SCHEDULED:   'Planifié',
  COMPLETED:   'Terminé',
  CANCELLED:   'Annulé',
  PUBLISHED:   'Publié',
  CLOSED:      'Clôturé',
  DRAFT:       'Brouillon',
};

/* ── Color maps ───────────────────────────────────────────── */
const ACTION_COLORS = {
  CANDIDATE_CREATED:            'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  CANDIDATE_UPDATED:            'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  CANDIDATE_DELETED:            'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  CANDIDATE_CONTACTED_UPDATED:  'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  APPLICATION_STATUS_CHANGED:   'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  REJECTION_EMAILS_SENT:        'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  INTERVIEW_NOTIFICATIONS_SENT: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  JOB_POSTING_CREATED:          'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  JOB_POSTING_UPDATED:          'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  JOB_POSTING_DELETED:          'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  JOB_POSTING_CLOSED:           'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300',
  JOB_POSTING_DUPLICATED:       'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  FICHE_FONCTION_GENERATED:     'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  INTERVIEW_SCHEDULED:          'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  INTERVIEW_UPDATED:            'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  INTERVIEW_CANCELLED:          'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const ENTITY_COLORS = {
  APPLICATION: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  CANDIDATE:   'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  JOB_POSTING: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  INTERVIEW:   'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
};

/* ── Detail formatter ─────────────────────────────────────── */
function formatDetails(action, detailsJson) {
  if (!detailsJson) return '—';
  try {
    const d = JSON.parse(detailsJson);
    switch (action) {
      case 'APPLICATION_STATUS_CHANGED':
        return `${d.candidateName || '—'} : ${STATUS_FR[d.oldStatus] || d.oldStatus} → ${STATUS_FR[d.newStatus] || d.newStatus} (${d.jobPostingTitle || '—'})`;
      case 'CANDIDATE_CREATED':
        return `${d.candidateName || '—'}${d.email ? ` — ${d.email}` : ''}`;
      case 'CANDIDATE_UPDATED':
      case 'CANDIDATE_DELETED':
        return d.candidateName || '—';
      case 'CANDIDATE_CONTACTED_UPDATED':
        return `${d.candidateName || '—'} → ${d.contacted ? 'Contacté' : 'Non contacté'}`;
      case 'JOB_POSTING_CREATED':
        return `${d.title || '—'}${d.department ? ` (${d.department})` : ''}`;
      case 'JOB_POSTING_UPDATED':
      case 'JOB_POSTING_DELETED':
      case 'JOB_POSTING_CLOSED':
      case 'FICHE_FONCTION_GENERATED':
        return d.title || '—';
      case 'JOB_POSTING_DUPLICATED':
        return `${d.title || '—'}`;
      case 'INTERVIEW_SCHEDULED':
        return `${d.candidateName || '—'} — ${d.jobPostingTitle || '—'}`;
      case 'INTERVIEW_UPDATED':
        if (d.oldStatus && d.newStatus) {
          return `${d.candidateName || '—'} : ${STATUS_FR[d.oldStatus] || d.oldStatus} → ${STATUS_FR[d.newStatus] || d.newStatus}`;
        }
        return d.candidateName || '—';
      case 'INTERVIEW_CANCELLED':
        return `${d.candidateName || '—'} — ${d.jobPostingTitle || '—'}`;
      case 'REJECTION_EMAILS_SENT':
      case 'INTERVIEW_NOTIFICATIONS_SENT':
        return `${d.count || 0} email(s) — ${d.jobPostingTitle || '—'}`;
      default:
        return Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(', ');
    }
  } catch {
    return detailsJson;
  }
}

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

/* ── Main page ────────────────────────────────────────────── */
export function AuditPage() {
  const axios = useAxiosPrivate();
  const api   = auditApi(axios);

  const [logs, setLogs]           = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading]     = useState(false);
  const [metaActions, setMetaActions] = useState([]);
  const [metaUsers, setMetaUsers]   = useState([]);

  const [filters, setFilters] = useState({
    action: '', entityType: '', performedBy: '', from: '', to: '',
  });
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  usePageActions(null);

  /* Load meta (distinct actions + users) once */
  useEffect(() => {
    api.getMeta()
      .then((r) => {
        setMetaActions(r.data.actions || []);
        setMetaUsers(r.data.users || []);
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        size: PAGE_SIZE,
        sort: 'timestamp,desc',
        ...(filters.action      && { action:      filters.action }),
        ...(filters.entityType  && { entityType:  filters.entityType }),
        ...(filters.performedBy && { performedBy: filters.performedBy }),
        ...(filters.from        && { from: new Date(filters.from).toISOString() }),
        ...(filters.to          && { to:   new Date(filters.to + 'T23:59:59').toISOString() }),
      };
      const r = await api.getAll(params);
      setLogs(r.data.content || []);
      setTotalPages(r.data.totalPages || 0);
      setTotalElements(r.data.totalElements || 0);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  const handleFilterChange = (key, val) => {
    setFilters((f) => ({ ...f, [key]: val }));
    setPage(0);
  };

  const resetFilters = () => {
    setFilters({ action: '', entityType: '', performedBy: '', from: '', to: '' });
    setPage(0);
  };

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Journal d'audit</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {totalElements} action{totalElements !== 1 ? 's' : ''} enregistrée{totalElements !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <MdRefresh className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Action filter */}
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Action</label>
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Toutes les actions</option>
              {metaActions.map((a) => (
                <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>
              ))}
            </select>
          </div>

          {/* Entity type filter */}
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Type d'entité</label>
            <select
              value={filters.entityType}
              onChange={(e) => handleFilterChange('entityType', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous les types</option>
              {Object.entries(ENTITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* User filter */}
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Utilisateur</label>
            <div className="relative">
              <MdSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={filters.performedBy}
                onChange={(e) => handleFilterChange('performedBy', e.target.value)}
                placeholder="Rechercher un utilisateur…"
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Date from */}
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Du</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => handleFilterChange('from', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date to */}
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Au</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => handleFilterChange('to', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Reset */}
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <MdClearAll className="w-4 h-4" />
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 dark:text-slate-500">
            <MdFilterList className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm">Aucune action trouvée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-700/30">
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Date / Heure</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Action</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Détails</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Effectué par</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-700/20 transition-colors"
                  >
                    {/* Timestamp */}
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500 dark:text-slate-400 font-mono text-xs">
                      {formatDate(log.timestamp)}
                    </td>

                    {/* Action badge */}
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>

                    {/* Entity type badge */}
                    <td className="px-4 py-3">
                      {log.entityType ? (
                        <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${ENTITY_COLORS[log.entityType] || 'bg-slate-100 text-slate-600'}`}>
                          {ENTITY_LABELS[log.entityType] || log.entityType}
                        </span>
                      ) : '—'}
                    </td>

                    {/* Details */}
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                      {formatDetails(log.action, log.details)}
                    </td>

                    {/* Performed by */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {log.performedByName || log.performedBy ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {(log.performedByName || log.performedBy || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {log.performedByName || log.performedBy}
                            </p>
                            {log.performedByName && log.performedBy && (
                              <p className="text-[11px] text-slate-400 dark:text-slate-500">{log.performedBy}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 text-xs">Système</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Page {page + 1} sur {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-300"
              >
                Précédent
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-300"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
