import { useEffect, useRef, useState } from 'react';
import {
  MdSearch, MdDownload, MdDelete, MdWarning, MdRefresh,
  MdStar, MdChevronLeft, MdChevronRight, MdCheck,
} from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import useAxiosPrivate from '../../api/useAxiosPrivate';
import { candidatesApi } from '../../api/candidates';
import { postingsApi } from '../../api/postings';
import { usePageActions } from '../../context/HeaderContext';
import { useToast } from '../../context/ToastContext';

const PAGE_SIZE = 30;

const pageWindow = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const pages = new Set([0, total - 1, current]);
  if (current > 1) pages.add(current - 1);
  if (current < total - 2) pages.add(current + 1);
  const sorted = [...pages].sort((a, b) => a - b);
  const result = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('…');
    result.push(sorted[i]);
  }
  return result;
};

export const CandidatesPage = () => {
  const axios      = useAxiosPrivate();
  const api        = candidatesApi(axios);
  const pApi       = postingsApi(axios);
  const navigate   = useNavigate();
  const { showToast } = useToast();

  const [candidates, setCandidates]       = useState([]);
  const [postings, setPostings]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [postingFilter, setPostingFilter] = useState('');
  const [page, setPage]                   = useState(0);
  const [totalPages, setTotalPages]       = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting]           = useState(false);

  const [selectionMode, setSelectionMode]           = useState(false);
  const [selectedIds, setSelectedIds]               = useState(new Set());
  const [confirmDeleteSelected, setConfirmDeleteSelected] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll]     = useState(false);
  const [deletingBulk, setDeletingBulk]             = useState(false);

  const debounceRef = useRef(null);
  const loadRef     = useRef();

  const load = (p = page, s = search, posting = postingFilter) => {
    setLoading(true);
    api.getAll({
      page: p,
      size: PAGE_SIZE,
      search: s || undefined,
      postingId: posting || undefined,
    })
      .then((r) => {
        setCandidates(r.data.content || []);
        setTotalPages(r.data.totalPages ?? 0);
        setTotalElements(r.data.totalElements ?? 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  loadRef.current = load;

  useEffect(() => {
    pApi.getAll({ size: 200 })
      .then((r) => setPostings(r.data.content || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    load(page, search, postingFilter);
  }, [page, postingFilter]);

  const goToPage = (p) => {
    setPage(p);
    setSelectedIds(new Set());
  };

  const handleSearchChange = (value) => {
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      goToPage(0);
      load(0, value, postingFilter);
    }, 350);
  };

  const handlePostingChange = (value) => {
    setPostingFilter(value);
    goToPage(0);
  };

  usePageActions(
    <button
      onClick={() => load(page, search, postingFilter)}
      className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
    >
      <MdRefresh className="w-4 h-4" /><span className="hidden sm:inline">Actualiser</span>
    </button>
  );

  const handleContactedToggle = async (e, candidateId, currentContacted) => {
    e.stopPropagation();
    setCandidates((prev) => prev.map((c) => c.id === candidateId ? { ...c, contacted: !currentContacted } : c));
    try {
      await api.updateContacted(candidateId, !currentContacted);
    } catch (err) {
      setCandidates((prev) => prev.map((c) => c.id === candidateId ? { ...c, contacted: currentContacted } : c));
      showToast('Erreur lors de la mise à jour', 'error');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.delete(confirmDelete.id);
      setConfirmDelete(null);
      load(page, search, postingFilter);
      showToast('Candidat supprimé avec succès');
    } catch (e) {
      console.error(e);
      showToast('Erreur lors de la suppression du candidat', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = async () => {
    const ids = [...selectedIds];
    const count = ids.length;
    setDeletingBulk(true);
    try {
      await Promise.all(ids.map((id) => api.delete(id)));
      setConfirmDeleteSelected(false);
      exitSelectionMode();
      load(page, search, postingFilter);
      showToast(`${count} candidat${count !== 1 ? 's' : ''} supprimé${count !== 1 ? 's' : ''}`);
    } catch (e) {
      console.error(e);
      showToast('Erreur lors de la suppression', 'error');
    } finally {
      setDeletingBulk(false);
    }
  };

  const handleDeleteAll = async () => {
    const items = [...candidates];
    const count = items.length;
    setDeletingBulk(true);
    try {
      await Promise.all(items.map((c) => api.delete(c.id)));
      setConfirmDeleteAll(false);
      exitSelectionMode();
      load(page, search, postingFilter);
      showToast(`${count} candidat${count !== 1 ? 's' : ''} supprimé${count !== 1 ? 's' : ''}`);
    } catch (e) {
      console.error(e);
      showToast('Erreur lors de la suppression', 'error');
    } finally {
      setDeletingBulk(false);
    }
  };

  const allSelected = candidates.length > 0 && candidates.every((c) => selectedIds.has(c.id));

  const from = totalElements === 0 ? 0 : page * PAGE_SIZE + 1;
  const to   = Math.min((page + 1) * PAGE_SIZE, totalElements);

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-5">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {totalElements} candidat{totalElements !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>
        <select
          value={postingFilter}
          onChange={(e) => handlePostingChange(e.target.value)}
          className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
        >
          <option value="">Toutes les offres</option>
          {postings.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
        <div className="flex gap-1.5">
          <button
            onClick={() => setConfirmDeleteAll(true)}
            disabled={candidates.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <MdDelete className="w-3.5 h-3.5" /> Tout supprimer
          </button>
          <button
            onClick={() => { setSelectionMode((v) => !v); setSelectedIds(new Set()); }}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
              selectionMode
                ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                : 'border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <MdCheck className="w-3.5 h-3.5" /> Sélectionner
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {selectionMode && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {selectedIds.size} sélectionné{selectedIds.size !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => setSelectedIds(allSelected ? new Set() : new Set(candidates.map((c) => c.id)))}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
              <div className="flex-1" />
              <button onClick={exitSelectionMode} className="text-xs text-slate-500 dark:text-slate-400 hover:underline">
                Annuler
              </button>
              {selectedIds.size > 0 && (
                <button
                  onClick={() => setConfirmDeleteSelected(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors"
                >
                  <MdDelete className="w-3.5 h-3.5" /> Supprimer ({selectedIds.size})
                </button>
              )}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  {selectionMode && <th className="w-10 px-4 py-3" />}
                  <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Candidat</th>
                  <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Email</th>
                  <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Offre d'emploi</th>
                  <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Exp.</th>
                  <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Score IA</th>
                  <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Contact</th>
                  <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">CV</th>
                  {!selectionMode && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {candidates.length === 0 ? (
                  <tr>
                    <td colSpan={selectionMode ? 7 : 8} className="text-center py-10 text-slate-400">Aucun candidat trouvé</td>
                  </tr>
                ) : candidates.map((c) => {
                  const isSelected = selectedIds.has(c.id);
                  return (
                    <tr
                      key={c.id}
                      className={`cursor-pointer transition-colors group ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/30'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                      onClick={() => selectionMode ? toggleSelect(c.id) : navigate(`/app/candidates/${c.id}`)}
                    >
                      {selectionMode && (
                        <td className="px-4 py-3">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {isSelected && <MdCheck className="w-3 h-3 text-white" />}
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        {c.firstName} {c.lastName}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{c.email || '—'}</td>
                      <td className="px-4 py-3">
                        {c.jobPostingTitles?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {c.jobPostingTitles.map((title, i) => (
                              <span key={i} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                                {title}
                              </span>
                            ))}
                          </div>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {c.experienceYears != null ? `${c.experienceYears} ans` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {c.aiScore != null ? (() => {
                          const n = Number(c.aiScore);
                          const cls = n >= 70
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : n >= 40
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300';
                          return (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
                              <MdStar className="w-3 h-3" />{n.toFixed(0)}
                            </span>
                          );
                        })() : <span className="text-slate-400 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {c.applicationStatus !== 'REJECTED' && (
                          <button
                            onClick={(e) => handleContactedToggle(e, c.id, c.contacted)}
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                              c.contacted
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            {c.contacted ? 'Contacté' : 'Non contacté'}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {c.cvPath ? (
                          <button
                            onClick={async () => {
                              try {
                                const res = await api.downloadCv(c.id);
                                const url = URL.createObjectURL(res.data);
                                Object.assign(document.createElement('a'), { href: url, download: `CV-${c.firstName}-${c.lastName}.pdf` }).click();
                                URL.revokeObjectURL(url);
                              } catch (e) { console.error(e); }
                            }}
                            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            <MdDownload className="w-4 h-4" /> CV
                          </button>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      {!selectionMode && (
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setConfirmDelete({ id: c.id, name: `${c.firstName} ${c.lastName}` })}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                            title="Supprimer le candidat"
                          >
                            <MdDelete className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {from}–{to} sur {totalElements} candidat{totalElements !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <MdChevronLeft className="w-5 h-5" />
                </button>

                {pageWindow(page, totalPages).map((item, i) =>
                  item === '…' ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-slate-400 text-sm select-none">…</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => goToPage(item)}
                      className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${
                        item === page
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {item + 1}
                    </button>
                  )
                )}

                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <MdChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-950 rounded-xl">
                <MdWarning className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Supprimer le candidat</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              Voulez-vous supprimer <span className="font-semibold text-slate-900 dark:text-white">"{confirmDelete.name}"</span> ?
            </p>
            <p className="text-xs text-red-500 mb-5">
              Cette action est irréversible. Le CV et toutes les candidatures associées seront supprimés.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)} disabled={deleting}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
                Annuler
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors">
                {deleting ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <MdDelete className="w-4 h-4" />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteSelected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-950 rounded-xl">
                <MdWarning className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Supprimer la sélection</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              Supprimer <span className="font-semibold text-slate-900 dark:text-white">{selectedIds.size} candidat{selectedIds.size !== 1 ? 's' : ''}</span> sélectionné{selectedIds.size !== 1 ? 's' : ''} ?
            </p>
            <p className="text-xs text-red-500 mb-5">Cette action est irréversible. Le CV et toutes les candidatures associées seront supprimés.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDeleteSelected(false)} disabled={deletingBulk}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
                Annuler
              </button>
              <button onClick={handleDeleteSelected} disabled={deletingBulk}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors">
                {deletingBulk ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <MdDelete className="w-4 h-4" />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-950 rounded-xl">
                <MdWarning className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Supprimer tous les candidats</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              Supprimer <span className="font-semibold text-slate-900 dark:text-white">{candidates.length} candidat{candidates.length !== 1 ? 's' : ''}</span> affichés sur cette page ?
            </p>
            <p className="text-xs text-red-500 mb-5">Cette action est irréversible. Le CV et toutes les candidatures associées seront supprimés.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDeleteAll(false)} disabled={deletingBulk}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
                Annuler
              </button>
              <button onClick={handleDeleteAll} disabled={deletingBulk}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors">
                {deletingBulk ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <MdDelete className="w-4 h-4" />}
                Supprimer tout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
