import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MdArrowBack, MdPlayArrow, MdClose, MdAutoAwesome,
  MdStar, MdRefresh, MdContentCopy, MdDownload,
} from 'react-icons/md';
import { StatusBadge } from '../../components/StatusBadge';
import useAxiosPrivate from '../../api/useAxiosPrivate';
import { postingsApi } from '../../api/postings';
import { applicationsApi } from '../../api/applications';
import { filterApi } from '../../api/filter';

const ScoreBadge = ({ score }) => {
  if (score == null) return <span className="text-slate-400 text-xs">—</span>;
  const n = Number(score);
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

export const PostingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const axios = useAxiosPrivate();
  const pApi = postingsApi(axios);
  const appApi = applicationsApi(axios);
  const fApi = filterApi(axios);

  const [posting, setPosting] = useState(null);
  const [applications, setApplications] = useState([]);
  const [filterJobs, setFilterJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const load = useCallback(() => {
    Promise.all([
      pApi.get(id),
      appApi.getByPosting(id),
      fApi.getForPosting(id).catch(() => ({ data: [] })),
    ])
      .then(([p, apps, fj]) => {
        setPosting(p.data);
        setApplications(apps.data || []);
        setFilterJobs(fj.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handlePublish = () => pApi.publish(id).then(load);
  const handleClose = () => pApi.close(id).then(load);

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      const res = await pApi.duplicate(id);
      navigate(`/app/postings/${res.data.id}`);
    } catch (e) {
      console.error(e);
    } finally {
      setDuplicating(false);
    }
  };

  const handleFilter = async () => {
    setFiltering(true);
    try {
      await fApi.requestFilter(id);
      setTimeout(load, 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setFiltering(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-12 h-12 rounded-full border-4 border-blue-100 dark:border-blue-900 border-t-blue-600 animate-spin" />
    </div>
  );

  if (!posting) return <div className="p-6 text-slate-400">Offre introuvable</div>;

  const latestFilter = filterJobs[0];
  const scoredApps = [...applications].sort((a, b) => (b.aiScore ?? -1) - (a.aiScore ?? -1));

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate('/app/postings')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <MdArrowBack className="w-4 h-4" />
        Retour aux offres
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{posting.title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {[posting.department, posting.location, posting.contractType].filter(Boolean).join(' · ')}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <StatusBadge status={posting.status} />
            {posting.deadline && (
              <span className="text-xs text-slate-400">
                Deadline : {new Date(posting.deadline).toLocaleDateString('fr-FR')}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {posting.status === 'DRAFT' && (
            <button onClick={handlePublish}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm">
              <MdPlayArrow className="w-4 h-4" /> Publier
            </button>
          )}
          {posting.status === 'PUBLISHED' && (
            <>
              <button
                onClick={handleFilter}
                disabled={filtering}
                className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {filtering ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Filtrage…
                  </>
                ) : (
                  <>
                    <MdAutoAwesome className="w-4 h-4" />
                    Lancer le filtre IA
                  </>
                )}
              </button>
              <button onClick={handleClose}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors shadow-sm">
                <MdClose className="w-4 h-4" /> Fermer l'offre
              </button>
            </>
          )}
          <button
            onClick={handleDuplicate}
            disabled={duplicating}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
          >
            {duplicating ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <MdContentCopy className="w-4 h-4" />
            )}
            Dupliquer
          </button>
          <a
            href={pApi.exportDocxUrl(id)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <MdDownload className="w-4 h-4" />
            Exporter Word
          </a>
          <button onClick={load} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <MdRefresh className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: description + requirements */}
        <div className="lg:col-span-2 space-y-4">
          {posting.description && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Description</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">{posting.description}</p>
            </div>
          )}
          {posting.requirements && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Exigences</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">{posting.requirements}</p>
            </div>
          )}

          {/* Filter job status */}
          {latestFilter && (
            <div className={`rounded-2xl border p-4 shadow-sm ${
              latestFilter.status === 'DONE'
                ? 'bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800'
                : latestFilter.status === 'FAILED'
                ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
            }`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <MdAutoAwesome className="w-4 h-4 text-violet-500" />
                  Dernier filtre IA — {latestFilter.status}
                </p>
                {latestFilter.status === 'PROCESSING' && (
                  <div className="w-4 h-4 border-2 border-amber-400 border-t-amber-700 rounded-full animate-spin" />
                )}
              </div>
              {latestFilter.status === 'FAILED' && latestFilter.errorMessage && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{latestFilter.errorMessage}</p>
              )}
            </div>
          )}
        </div>

        {/* Right: ranked candidates */}
        <div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Candidatures ({applications.length})
              </h3>
              {scoredApps.some((a) => a.aiScore != null) && (
                <p className="text-xs text-slate-400 mt-0.5">Classées par score IA</p>
              )}
            </div>
            {applications.length === 0 ? (
              <p className="text-sm text-slate-400 p-4">Aucune candidature</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[500px] overflow-y-auto">
                {scoredApps.map((app) => (
                  <div key={app.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p
                          className="text-sm font-medium text-slate-900 dark:text-white truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                          onClick={() => navigate(`/app/candidates/${app.candidateId}`)}
                        >
                          {app.candidateFirstName} {app.candidateLastName}
                        </p>
                        {app.aiSummary && (
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{app.aiSummary}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <StatusBadge status={app.status} />
                        <ScoreBadge score={app.aiScore} />
                      </div>
                    </div>
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
