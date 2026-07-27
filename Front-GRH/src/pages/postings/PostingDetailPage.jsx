import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MdArrowBack, MdPlayArrow, MdClose, MdAutoAwesome } from 'react-icons/md';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import useAxiosPrivate from '../../api/useAxiosPrivate';
import { postingsApi } from '../../api/postings';
import { applicationsApi } from '../../api/applications';
import { filterApi } from '../../api/filter';

export const PostingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const axios = useAxiosPrivate();
  const pApi = postingsApi(axios);
  const appApi = applicationsApi(axios);
  const fApi = filterApi(axios);

  const [posting, setPosting] = useState(null);
  const [applications, setApplications] = useState([]);
  const [filterStatus, setFilterStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);

  const load = () => {
    Promise.all([
      pApi.get(id),
      appApi.getByPosting(id),
    ])
      .then(([p, apps]) => {
        setPosting(p.data);
        setApplications(apps.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handlePublish = () => pApi.publish(id).then(load);
  const handleClose = () => pApi.close(id).then(load);

  const handleFilter = async () => {
    setFiltering(true);
    try {
      const r = await fApi.requestFilter(id);
      setFilterStatus(r.data.status);
    } catch (e) {
      console.error(e);
    } finally {
      setFiltering(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  );

  if (!posting) return <div className="p-6 text-slate-400">Offre introuvable</div>;

  return (
    <div className="p-6">
      <button
        onClick={() => navigate('/app/postings')}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white mb-4"
      >
        <MdArrowBack className="w-4 h-4" /> Retour
      </button>

      <PageHeader
        title={posting.title}
        subtitle={`${posting.department || ''} · ${posting.location || ''} · ${posting.contractType || ''}`}
        action={
          <div className="flex gap-2">
            {posting.status === 'DRAFT' && (
              <button onClick={handlePublish}
                className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                <MdPlayArrow className="w-4 h-4" /> Publier
              </button>
            )}
            {posting.status === 'PUBLISHED' && (
              <>
                <button
                  onClick={handleFilter}
                  disabled={filtering}
                  className="flex items-center gap-1 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
                >
                  <MdAutoAwesome className="w-4 h-4" />
                  {filtering ? 'Filtrage...' : 'Filtrage IA'}
                </button>
                <button onClick={handleClose}
                  className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
                  <MdClose className="w-4 h-4" /> Fermer
                </button>
              </>
            )}
          </div>
        }
      />

      <div className="flex items-center gap-3 mb-6">
        <StatusBadge status={posting.status} />
        {posting.deadline && (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Deadline: {new Date(posting.deadline).toLocaleDateString('fr-FR')}
          </span>
        )}
        {filterStatus && (
          <span className="text-sm text-purple-600 dark:text-purple-400">
            Filtrage IA: <StatusBadge status={filterStatus} />
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {posting.description && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Description</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{posting.description}</p>
            </div>
          )}
          {posting.requirements && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Exigences</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{posting.requirements}</p>
            </div>
          )}
        </div>

        <div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
              Candidatures ({applications.length})
            </h3>
            {applications.length === 0 ? (
              <p className="text-sm text-slate-400">Aucune candidature</p>
            ) : (
              <div className="space-y-3">
                {applications.slice(0, 10).map((app) => (
                  <div key={app.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {app.candidateFirstName} {app.candidateLastName}
                      </p>
                      {app.aiScore != null && (
                        <p className="text-xs text-slate-500">Score IA: {app.aiScore}/100</p>
                      )}
                    </div>
                    <StatusBadge status={app.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
