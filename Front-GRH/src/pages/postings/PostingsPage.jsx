import { useEffect, useState } from 'react';
import { MdAdd, MdSearch } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '../../components/StatusBadge';
import useAxiosPrivate from '../../api/useAxiosPrivate';
import { postingsApi } from '../../api/postings';
import { CreatePostingModal } from './CreatePostingModal';

export const PostingsPage = () => {
  const axios = useAxiosPrivate();
  const api = postingsApi(axios);
  const navigate = useNavigate();

  const [postings, setPostings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    api.getAll({ status: statusFilter || undefined, size: 100 })
      .then((r) => setPostings(r.data.content || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  const filtered = postings.filter((p) =>
    !search || p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.department?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {postings.length} offre{postings.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-semibold shadow-sm transition-colors"
        >
          <MdAdd className="w-5 h-5" />
          Nouvelle offre
        </button>
      </div>

      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
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
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
        >
          <option value="">Tous les statuts</option>
          <option value="DRAFT">Brouillon</option>
          <option value="PUBLISHED">Publié</option>
          <option value="CLOSED">Fermé</option>
        </select>
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
                <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Titre</th>
                <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Département</th>
                <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Type</th>
                <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Statut</th>
                <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Date limite</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400">Aucune offre trouvée</td>
                </tr>
              ) : filtered.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  onClick={() => navigate(`/app/postings/${p.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{p.title}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{p.department || '—'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{p.contractType || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {p.deadline ? new Date(p.deadline).toLocaleDateString('fr-FR') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreatePostingModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
          axios={axios}
        />
      )}
    </div>
  );
};
