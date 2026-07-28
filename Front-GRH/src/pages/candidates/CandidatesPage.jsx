import { useEffect, useState } from 'react';
import { MdAdd, MdSearch, MdDownload } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import useAxiosPrivate from '../../api/useAxiosPrivate';
import { candidatesApi } from '../../api/candidates';
import { CreateCandidateModal } from './CreateCandidateModal';

export const CandidatesPage = () => {
  const axios = useAxiosPrivate();
  const api = candidatesApi(axios);
  const navigate = useNavigate();

  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    api.getAll({ size: 100 })
      .then((r) => setCandidates(r.data.content || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = candidates.filter((c) =>
    !search ||
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

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

      <div className="relative mb-5 max-w-xs">
        <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Candidat</th>
                <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Email</th>
                <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Poste actuel</th>
                <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Exp.</th>
                <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">CV</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400">Aucun candidat trouvé</td>
                </tr>
              ) : filtered.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  onClick={() => navigate(`/app/candidates/${c.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                    {c.firstName} {c.lastName}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{c.email || '—'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{c.currentPosition || '—'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {c.experienceYears != null ? `${c.experienceYears} ans` : '—'}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    {c.cvPath ? (
                      <a
                        href={api.cvUrl(c.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <MdDownload className="w-4 h-4" /> CV
                      </a>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateCandidateModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
          axios={axios}
        />
      )}
    </div>
  );
};
