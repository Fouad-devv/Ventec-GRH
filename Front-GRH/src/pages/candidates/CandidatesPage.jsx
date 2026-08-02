import { useEffect, useState } from 'react';
import { MdAdd, MdSearch, MdDownload, MdDelete, MdWarning, MdRefresh, MdStar } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import useAxiosPrivate from '../../api/useAxiosPrivate';
import { candidatesApi } from '../../api/candidates';
import { postingsApi } from '../../api/postings';
import { CreateCandidateModal } from './CreateCandidateModal';
import { usePageActions } from '../../context/HeaderContext';

export const CandidatesPage = () => {
  const axios = useAxiosPrivate();
  const api = candidatesApi(axios);
  const pApi = postingsApi(axios);
  const navigate = useNavigate();

  const [candidates, setCandidates] = useState([]);
  const [postings, setPostings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [postingFilter, setPostingFilter] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    api.getAll({ size: 100, postingId: postingFilter || undefined })
      .then((r) => setCandidates(r.data.content || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    pApi.getAll({ size: 200 })
      .then((r) => setPostings(r.data.content || []))
      .catch(console.error);
  }, []);

  useEffect(() => { load(); }, [postingFilter]);

  usePageActions(
    <button onClick={load} className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
      <MdRefresh className="w-4 h-4" /><span className="hidden sm:inline">Actualiser</span>
    </button>
  );

  const filtered = candidates.filter((c) =>
    !search ||
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.delete(confirmDelete.id);
      setConfirmDelete(null);
      load();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {candidates.length} candidat{candidates.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-semibold shadow-sm transition-colors"
        >
          <MdAdd className="w-5 h-5" />
          Ajouter un candidat
        </button>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>
        <select
          value={postingFilter}
          onChange={(e) => setPostingFilter(e.target.value)}
          className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
        >
          <option value="">Toutes les offres</option>
          {postings.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Candidat</th>
                <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Email</th>
                <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Offre d'emploi</th>
                <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Exp.</th>
                {postingFilter && <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Score IA</th>}
                <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">CV</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={postingFilter ? 7 : 6} className="text-center py-10 text-slate-400">Aucun candidat trouvé</td>
                </tr>
              ) : filtered.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer group"
                  onClick={() => navigate(`/app/candidates/${c.id}`)}
                >
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
                  {postingFilter && (
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
                  )}
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
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setConfirmDelete({ id: c.id, name: `${c.firstName} ${c.lastName}` })}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                      title="Supprimer le candidat"
                    >
                      <MdDelete className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateCandidateModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
          axios={axios}
        />
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
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <MdDelete className="w-4 h-4" />
                )}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
