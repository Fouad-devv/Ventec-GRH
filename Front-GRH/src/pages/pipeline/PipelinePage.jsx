import { useEffect, useState } from 'react';
import { MdCalendarMonth, MdStar, MdAutoAwesome, MdDownload, MdClose, MdQuestionAnswer, MdDescription, MdRefresh } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '../../components/StatusBadge';
import { usePageActions } from '../../context/HeaderContext';
import useAxiosPrivate from '../../api/useAxiosPrivate';
import { postingsApi } from '../../api/postings';
import { applicationsApi } from '../../api/applications';
import { interviewsApi } from '../../api/interviews';

const ScoreBadge = ({ score }) => {
  if (score == null) return null;
  const n = Number(score);
  const cls = n >= 70
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
    : n >= 40
    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
    : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300';
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      <MdStar className="w-2.5 h-2.5" />{n.toFixed(0)}
    </span>
  );
};

const STATUSES = ['NEW', 'SCREENING', 'SHORTLISTED', 'INTERVIEW', 'HIRED', 'REJECTED'];

const ScheduleInterviewModal = ({ application, onClose, onScheduled, axios }) => {
  const api = interviewsApi(axios);
  const [form, setForm] = useState({ scheduledAt: '', durationMinutes: 60, type: 'VIDEO', locationOrLink: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.schedule({ applicationId: application.id, ...form, scheduledAt: new Date(form.scheduledAt).toISOString() });
      onScheduled();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md mx-4 shadow-xl p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Planifier un entretien</h2>
        <p className="text-sm text-slate-500 mb-4">
          {application.candidateFirstName} {application.candidateLastName} — {application.jobPostingTitle}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="datetime-local" required value={form.scheduledAt} onChange={set('scheduledAt')}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.type} onChange={set('type')}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
              <option value="VIDEO">Visio</option><option value="PHONE">Téléphone</option><option value="ON_SITE">Présentiel</option>
            </select>
            <input type="number" min={15} value={form.durationMinutes} onChange={set('durationMinutes')}
              placeholder="Durée (min)" className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
          </div>
          <input value={form.locationOrLink} onChange={set('locationOrLink')} placeholder="Lien ou lieu"
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">Annuler</button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
              {saving ? 'Planification...' : 'Planifier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const InterviewDetailModal = ({ application, onClose, axios }) => {
  const iApi = interviewsApi(axios);
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    iApi.getByApplication(application.id)
      .then((r) => {
        const iv = Array.isArray(r.data) ? r.data[0] : r.data;
        setInterview(iv ?? null);
        if (iv?.questions) {
          try { setQuestions(JSON.parse(iv.questions)); } catch { setQuestions([]); }
        }
      })
      .catch(() => setInterview(null))
      .finally(() => setLoading(false));
  }, [application.id]);

  const handleGenerate = async () => {
    if (!interview) return;
    setGenerating(true);
    try {
      const res = await iApi.generateQuestions(interview.id);
      const iv = res.data;
      setInterview(iv);
      if (iv?.questions) {
        try { setQuestions(JSON.parse(iv.questions)); } catch { setQuestions([]); }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const TYPE_LABELS = { VIDEO: 'Visioconférence', PHONE: 'Téléphone', ON_SITE: 'Présentiel' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg mx-4 shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Détails de l'entretien</h2>
            <p className="text-xs text-slate-400 mt-0.5">{application.candidateFirstName} {application.candidateLastName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            <MdClose className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 rounded-full border-4 border-blue-100 dark:border-blue-900 border-t-blue-600 animate-spin" />
            </div>
          ) : !interview ? (
            <p className="text-sm text-slate-400 text-center py-6">Aucun entretien planifié pour cette candidature.</p>
          ) : (
            <>
              {/* Interview info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-0.5">Type</p>
                  <p className="font-medium text-slate-900 dark:text-white">{TYPE_LABELS[interview.type] ?? interview.type}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-0.5">Durée</p>
                  <p className="font-medium text-slate-900 dark:text-white">{interview.durationMinutes} min</p>
                </div>
                {interview.scheduledAt && (
                  <div className="col-span-2 bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                    <p className="text-xs text-slate-400 mb-0.5">Date &amp; heure</p>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {new Date(interview.scheduledAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                )}
                {interview.locationOrLink && (
                  <div className="col-span-2 bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                    <p className="text-xs text-slate-400 mb-0.5">Lien / Lieu</p>
                    <p className="font-medium text-slate-900 dark:text-white break-all">{interview.locationOrLink}</p>
                  </div>
                )}
                {interview.notes && (
                  <div className="col-span-2 bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                    <p className="text-xs text-slate-400 mb-0.5">Notes</p>
                    <p className="text-slate-700 dark:text-slate-300 text-xs whitespace-pre-wrap">{interview.notes}</p>
                  </div>
                )}
              </div>

              {/* AI questions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <MdQuestionAnswer className="w-4 h-4 text-violet-500" />
                    Questions IA
                  </h3>
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors"
                  >
                    {generating ? (
                      <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <MdAutoAwesome className="w-3 h-3" />
                    )}
                    {generating ? 'Génération…' : questions.length ? 'Regénérer' : 'Générer'}
                  </button>
                </div>
                {questions.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Aucune question générée. Cliquez sur "Générer" pour créer des questions personnalisées avec l'IA.</p>
                ) : (
                  <ol className="space-y-3">
                    {questions.map((q, i) => {
                      const questionText = typeof q === 'string' ? q : q?.question;
                      const answerText = typeof q === 'object' ? q?.answer : null;
                      return (
                        <li key={i} className="flex gap-2.5">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 text-xs flex items-center justify-center font-bold mt-0.5">{i + 1}</span>
                          <div className="min-w-0">
                            <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">{questionText}</p>
                            {answerText && (
                              <div className="mt-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 rounded-lg">
                                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-0.5">Réponse attendue</p>
                                <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">{answerText}</p>
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {interview && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <button
              onClick={async () => {
                try {
                  const res = await iApi.exportPdf(interview.id);
                  const url = URL.createObjectURL(res.data);
                  Object.assign(document.createElement('a'), { href: url, download: `entretien-${interview.id}.pdf` }).click();
                  URL.revokeObjectURL(url);
                } catch (e) { console.error(e); }
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              <MdDownload className="w-4 h-4" />
              Exporter PDF
            </button>
            <button onClick={onClose} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
              Fermer
            </button>
          </div>
        )}
        {!interview && !loading && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button onClick={onClose} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400">
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const PipelinePage = () => {
  const axios = useAxiosPrivate();
  const navigate = useNavigate();
  const pApi = postingsApi(axios);
  const appApi = applicationsApi(axios);

  const [postings, setPostings] = useState([]);
  const [selectedPosting, setSelectedPosting] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scheduleApp, setScheduleApp] = useState(null);
  const [detailApp, setDetailApp] = useState(null);

  useEffect(() => {
    pApi.getAll({ status: 'PUBLISHED', size: 100 })
      .then((r) => setPostings(r.data.content || []))
      .catch(console.error);
  }, []);

  const loadApplications = () => {
    if (!selectedPosting) return;
    setLoading(true);
    appApi.getByPosting(selectedPosting)
      .then((r) => setApplications(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadApplications(); }, [selectedPosting]);

  usePageActions(
    <button onClick={loadApplications} className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
      <MdRefresh className="w-4 h-4" /><span className="hidden sm:inline">Actualiser</span>
    </button>
  );

  const updateStatus = async (appId, status) => {
    await appApi.updateStatus(appId, { status });
    setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, status } : a));
  };

  const downloadDocuments = async (app) => {
    try {
      const res = await appApi.downloadDocumentsList(app.id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `liste-documents-${app.candidateFirstName}-${app.candidateLastName}.docx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Téléchargement liste documents échoué', e);
    }
  };

  const byStatus = (status) => applications.filter((a) => a.status === status);

  return (
    <div className="p-6">

      <div className="mb-6">
        <select
          value={selectedPosting || ''}
          onChange={(e) => setSelectedPosting(e.target.value)}
          className="w-full sm:w-auto text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white sm:min-w-[280px]"
        >
          <option value="">— Sélectionner une offre —</option>
          {postings.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
      </div>

      {!selectedPosting ? (
        <div className="text-center py-20 text-slate-400">Sélectionnez une offre pour voir le pipeline</div>
      ) : loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {STATUSES.map((status) => (
            <div key={status} className="flex flex-col gap-2">
              <div className="flex items-center justify-between mb-1">
                <StatusBadge status={status} />
                <span className="text-xs text-slate-400">{byStatus(status).length}</span>
              </div>
              {byStatus(status).map((app) => (
                <div key={app.id} className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-3 text-sm shadow-sm">
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <p
                      className="font-medium text-slate-900 dark:text-white text-xs truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                      onClick={() => navigate(`/app/candidates/${app.candidateId}`)}
                    >
                      {app.candidateFirstName} {app.candidateLastName}
                    </p>
                    <ScoreBadge score={app.aiScore} />
                  </div>
                  <div className="mt-2 space-y-1">
                    <select
                      value={app.status}
                      onChange={(e) => updateStatus(app.id, e.target.value)}
                      className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded px-1 py-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s === 'NEW' ? 'Nouveau'
                            : s === 'SCREENING' ? 'Présélection'
                            : s === 'SHORTLISTED' ? 'Sélectionné'
                            : s === 'INTERVIEW' ? 'Entretien'
                            : s === 'HIRED' ? 'Embauché'
                            : s === 'REJECTED' ? 'Rejeté'
                            : s}
                        </option>
                      ))}
                    </select>
                    {app.status === 'INTERVIEW' && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => setScheduleApp(app)}
                          className="flex-1 flex items-center justify-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <MdCalendarMonth className="w-3 h-3" /> Planifier
                        </button>
                        <button
                          onClick={() => setDetailApp(app)}
                          className="flex-1 flex items-center justify-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:underline"
                        >
                          <MdAutoAwesome className="w-3 h-3" /> Questions
                        </button>
                      </div>
                    )}
                    {app.status === 'HIRED' && (
                      <button
                        onClick={() => downloadDocuments(app)}
                        className="w-full flex items-center justify-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline mt-1"
                        title="Télécharger la liste des documents à fournir"
                      >
                        <MdDescription className="w-3 h-3" /> Liste documents
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {scheduleApp && (
        <ScheduleInterviewModal
          application={scheduleApp}
          axios={axios}
          onClose={() => setScheduleApp(null)}
          onScheduled={() => setScheduleApp(null)}
        />
      )}

      {detailApp && (
        <InterviewDetailModal
          application={detailApp}
          axios={axios}
          onClose={() => setDetailApp(null)}
        />
      )}
    </div>
  );
};
