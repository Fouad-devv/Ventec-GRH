import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MdEmail, MdRefresh, MdCheckCircle, MdWarning,
  MdError, MdPictureAsPdf, MdInbox, MdDelete, MdSubject,
} from 'react-icons/md';
import useAxiosPrivate from '../../api/useAxiosPrivate';
import { emailCandidaturesApi } from '../../api/emailCandidatures';
import { usePageActions } from '../../context/HeaderContext';

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  MATCHED: {
    label: 'Candidature créée',
    icon: MdCheckCircle,
    classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  DUPLICATE: {
    label: 'Déjà candidaté',
    icon: MdWarning,
    classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  NO_MATCH: {
    label: 'Aucune offre trouvée',
    icon: MdError,
    classes: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  },
  NO_PDF: {
    label: 'CV manquant',
    icon: MdPictureAsPdf,
    classes: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  },
  NO_SUBJECT: {
    label: 'Objet manquant',
    icon: MdError,
    classes: 'bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300',
  },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.NO_MATCH;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${cfg.classes}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {cfg.label}
    </span>
  );
};

// ── Date helper ───────────────────────────────────────────────────────────────

const fmt = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// ── Stat card (same style as dashboard) ──────────────────────────────────────

const StatCard = ({ icon: Icon, label, value, gradient, numGradient, sub }) => (
  <div className="group relative overflow-hidden bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-2 py-3 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-transparent transition-all duration-300 cursor-default">
    <div className={`absolute inset-x-0 top-0 h-[2px] group-hover:h-[3px] bg-gradient-to-r ${gradient} transition-all duration-300`} />
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-[0.05] dark:group-hover:opacity-[0.1] transition-opacity duration-300`} />
    <div className="relative flex items-center justify-between gap-2 pt-0.5">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-tight">{label}</p>
        <p className={`text-2xl font-extrabold mt-1 leading-none tabular-nums bg-gradient-to-br ${numGradient} bg-clip-text text-transparent`}>
          {value ?? '—'}
        </p>
        {sub && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 truncate">{sub}</p>}
      </div>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br ${gradient} shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all duration-300`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
    </div>
  </div>
);

// ── Confirm modal ─────────────────────────────────────────────────────────────

const ConfirmModal = ({ title, message, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/[0.08] w-full max-w-sm p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
          <MdDelete className="w-5 h-5 text-rose-600 dark:text-rose-400" />
        </div>
        <div>
          <p className="font-semibold text-slate-900 dark:text-white text-sm">{title}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{message}</p>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors disabled:opacity-50"
        >
          Annuler
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="px-4 py-2 text-sm rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium flex items-center gap-2 transition-colors disabled:opacity-60"
        >
          {loading
            ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            : <MdDelete className="w-4 h-4" />}
          Supprimer
        </button>
      </div>
    </div>
  </div>
);

// ── Checkbox ──────────────────────────────────────────────────────────────────

const Checkbox = ({ checked, indeterminate = false, onChange, className = '' }) => (
  <input
    type="checkbox"
    checked={checked}
    ref={(el) => { if (el) el.indeterminate = indeterminate; }}
    onChange={onChange}
    className={`w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 bg-white dark:bg-slate-800 cursor-pointer accent-blue-600 ${className}`}
  />
);

// ── Page ──────────────────────────────────────────────────────────────────────

export const EmailCandidaturesPage = () => {
  const axios    = useAxiosPrivate();
  const api      = emailCandidaturesApi(axios);
  const navigate = useNavigate();

  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [filterStatus,  setFilterStatus]  = useState('');
  const [filterPosting, setFilterPosting] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

  // Selection
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Confirm states
  const [confirmDelete,   setConfirmDelete]   = useState(null);   // { id, label }
  const [confirmSelected, setConfirmSelected] = useState(false);
  const [confirmAll,      setConfirmAll]       = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setSelectedIds(new Set());
    api.getAll()
      .then((r) => setItems(r.data))
      .catch((e) => console.error('EmailCandidatures load error:', e))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Filters & derived data ────────────────────────────────────────────────

  const postingOptions = useMemo(() => {
    const seen = new Set();
    const opts = [];
    for (const item of items) {
      if (item.matchedPostingTitle && !seen.has(item.matchedPostingTitle)) {
        seen.add(item.matchedPostingTitle);
        opts.push(item.matchedPostingTitle);
      }
    }
    return opts.sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filteredItems = useMemo(() => {
    setPage(1);
    return items.filter((item) => {
      if (filterStatus  && item.status              !== filterStatus)  return false;
      if (filterPosting && item.matchedPostingTitle !== filterPosting) return false;
      return true;
    });
  }, [items, filterStatus, filterPosting]);

  const totalPages    = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const paginatedItems = filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Selection helpers ─────────────────────────────────────────────────────

  const allSelected  = filteredItems.length > 0 && filteredItems.every((i) => selectedIds.has(i.id));
  const someSelected = filteredItems.some((i) => selectedIds.has(i.id)) && !allSelected;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredItems.forEach((i) => next.delete(i.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredItems.forEach((i) => next.add(i.id));
        return next;
      });
    }
  };

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Delete handlers ───────────────────────────────────────────────────────

  const handleDeleteOne = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.delete(confirmDelete.id);
      setItems((prev) => prev.filter((i) => i.id !== confirmDelete.id));
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(confirmDelete.id); return n; });
      setConfirmDelete(null);
    } catch (e) {
      console.error('Delete error:', e);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSelected = async () => {
    setDeleting(true);
    try {
      await Promise.all([...selectedIds].map((id) => api.delete(id)));
      setItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
      setSelectedIds(new Set());
      setConfirmSelected(false);
    } catch (e) {
      console.error('Bulk delete error:', e);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    setDeleting(true);
    try {
      await api.deleteAll();
      setItems([]);
      setSelectedIds(new Set());
      setConfirmAll(false);
    } catch (e) {
      console.error('Delete all error:', e);
    } finally {
      setDeleting(false);
    }
  };

  // ── Header actions ────────────────────────────────────────────────────────

  usePageActions(
    <div className="flex items-center gap-2">
      {selectedIds.size > 0 && (
        <button
          onClick={() => setConfirmSelected(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors"
        >
          <MdDelete className="w-4 h-4" />
          Supprimer ({selectedIds.size})
        </button>
      )}
      {items.length > 0 && selectedIds.size === 0 && (
        <button
          onClick={() => setConfirmAll(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl border border-rose-200 dark:border-rose-800/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
        >
          <MdDelete className="w-4 h-4" />
          Tout supprimer
        </button>
      )}
      <button
        onClick={load}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
      >
        <MdRefresh className="w-4 h-4" />
        Actualiser
      </button>
    </div>
  );

  // Stats
  const todayStr  = new Date().toDateString();
  const isToday   = (iso) => iso && new Date(iso).toDateString() === todayStr;

  const totalToday   = items.filter((i) => isToday(i.receivedAt)).length;
  const matchedToday = items.filter((i) => i.status === 'MATCHED' && isToday(i.receivedAt)).length;
  const noMatch      = items.filter((i) => i.status === 'NO_MATCH').length;
  const noPdf        = items.filter((i) => i.status === 'NO_PDF').length;
  const noSubject    = items.filter((i) => i.status === 'NO_SUBJECT').length;

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          icon={MdEmail}
          label="Total reçus"
          value={totalToday}
          sub="aujourd'hui"
          gradient="from-blue-500 to-blue-700"
          numGradient="from-blue-900 to-blue-600 dark:from-blue-300 dark:to-blue-500"
        />
        <StatCard
          icon={MdCheckCircle}
          label="Candidatures créées"
          value={matchedToday}
          sub="aujourd'hui"
          gradient="from-emerald-500 to-emerald-700"
          numGradient="from-emerald-900 to-emerald-600 dark:from-emerald-300 dark:to-emerald-500"
        />
        <StatCard
          icon={MdError}
          label="Sans offre trouvée"
          value={noMatch}
          gradient="from-rose-500 to-rose-700"
          numGradient="from-rose-900 to-rose-600 dark:from-rose-300 dark:to-rose-500"
        />
        <StatCard
          icon={MdPictureAsPdf}
          label="Sans CV joint"
          value={noPdf}
          gradient="from-orange-500 to-orange-700"
          numGradient="from-orange-900 to-orange-600 dark:from-orange-300 dark:to-orange-500"
        />
        <StatCard
          icon={MdSubject}
          label="Sans objet"
          value={noSubject}
          gradient="from-slate-400 to-slate-600"
          numGradient="from-slate-700 to-slate-500 dark:from-slate-300 dark:to-slate-400"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>

        <select
          value={filterPosting}
          onChange={(e) => setFilterPosting(e.target.value)}
          className="text-sm rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        >
          <option value="">Toutes les offres</option>
          {postingOptions.map((title) => (
            <option key={title} value={title}>{title}</option>
          ))}
        </select>

        {(filterStatus || filterPosting) && (
          <>
            <button
              onClick={() => { setFilterStatus(''); setFilterPosting(''); }}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline"
            >
              Réinitialiser
            </button>
            <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">
              {filteredItems.length} résultat{filteredItems.length !== 1 ? 's' : ''}
            </span>
          </>
        )}
      </div>

      {/* Selection toolbar — shown when rows are selected */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-2xl">
          <MdEmail className="w-4 h-4 text-blue-500 shrink-0" />
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300 flex-1">
            {selectedIds.size} entrée{selectedIds.size > 1 ? 's' : ''} sélectionnée{selectedIds.size > 1 ? 's' : ''}
          </p>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-blue-500 dark:text-blue-400 hover:underline"
          >
            Désélectionner tout
          </button>
          <button
            onClick={() => setConfirmSelected(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors"
          >
            <MdDelete className="w-3.5 h-3.5" />
            Supprimer la sélection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl overflow-hidden">

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400 dark:text-slate-600">
            <MdInbox className="w-12 h-12" />
            <p className="text-sm font-medium">
              {items.length === 0 ? 'Aucun email traité pour le moment' : 'Aucun résultat pour ces filtres'}
            </p>
            <p className="text-xs">
              {items.length === 0
                ? 'Les emails reçus apparaîtront ici après le prochain scan IMAP'
                : 'Modifiez ou réinitialisez les filtres pour voir les entrées'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto xl:overflow-x-visible">
            <table className="w-full text-sm min-w-[700px] xl:min-w-0">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-white/[0.06] bg-slate-50/80 dark:bg-white/[0.02]">
                  {/* Select-all checkbox */}
                  <th className="w-10 px-4 py-3">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reçu le</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Expéditeur</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Objet</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Statut</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Offre correspondante</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Candidat</th>
                  <th className="w-12 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {paginatedItems.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors group ${
                        isSelected
                          ? 'bg-blue-50/60 dark:bg-blue-900/10'
                          : 'hover:bg-slate-50/80 dark:hover:bg-white/[0.03]'
                      }`}
                    >
                      {/* Row checkbox */}
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleOne(item.id)}
                        />
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                        {fmt(item.receivedAt)}
                      </td>

                      {/* Sender */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 dark:text-slate-200 text-sm leading-tight">
                          {item.senderName || item.senderEmail}
                        </p>
                        {item.senderName && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                            {item.senderEmail}
                          </p>
                        )}
                      </td>

                      {/* Subject */}
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-xs text-slate-700 dark:text-slate-300 truncate" title={item.subject}>
                          {item.subject}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={item.status} />
                      </td>

                      {/* Matched posting */}
                      <td className="px-4 py-3">
                        {item.matchedPostingId ? (
                          <button
                            onClick={() => navigate(`/app/postings/${item.matchedPostingId}`)}
                            className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium text-left"
                          >
                            {item.matchedPostingTitle || "Voir l'offre"}
                          </button>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-xs italic">
                            {item.status === 'NO_MATCH'
                              ? 'Aucune offre ne correspond à cet objet'
                              : item.status === 'NO_PDF'
                              ? 'CV manquant — non traité'
                              : item.status === 'NO_SUBJECT'
                              ? 'Objet manquant — impossible de traiter'
                              : '—'}
                          </span>
                        )}
                      </td>

                      {/* Candidate */}
                      <td className="px-4 py-3">
                        {item.candidateId ? (
                          <button
                            onClick={() => navigate(`/app/candidates/${item.candidateId}`)}
                            className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium text-left"
                          >
                            {item.candidateName || 'Voir le candidat'}
                          </button>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-xs">—</span>
                        )}
                      </td>

                      {/* Delete row button */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setConfirmDelete({ id: item.id, label: item.subject })}
                          className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 opacity-0 group-hover:opacity-100 transition-all"
                          title="Supprimer cette entrée"
                        >
                          <MdDelete className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredItems.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-white/[0.04]">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredItems.length)} sur {filteredItems.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Précédent
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  p === '…' ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-xs text-slate-400">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 text-xs rounded-lg border transition-colors ${
                        p === page
                          ? 'bg-blue-600 border-blue-600 text-white font-semibold'
                          : 'border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Suivant →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirm modals */}
      {confirmDelete && (
        <ConfirmModal
          title="Supprimer cette entrée ?"
          message={`"${confirmDelete.label}" sera supprimée définitivement de l'historique.`}
          onConfirm={handleDeleteOne}
          onCancel={() => setConfirmDelete(null)}
          loading={deleting}
        />
      )}

      {confirmSelected && (
        <ConfirmModal
          title={`Supprimer ${selectedIds.size} entrée${selectedIds.size > 1 ? 's' : ''} ?`}
          message="Les entrées sélectionnées seront supprimées définitivement. Cette action est irréversible."
          onConfirm={handleDeleteSelected}
          onCancel={() => setConfirmSelected(false)}
          loading={deleting}
        />
      )}

      {confirmAll && (
        <ConfirmModal
          title="Supprimer tout l'historique ?"
          message="Toutes les entrées de candidatures email seront supprimées définitivement. Cette action est irréversible."
          onConfirm={handleDeleteAll}
          onCancel={() => setConfirmAll(false)}
          loading={deleting}
        />
      )}

    </div>
  );
};
