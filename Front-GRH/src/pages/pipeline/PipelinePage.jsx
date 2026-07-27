import { useEffect, useState } from 'react';
import { MdSearch, MdCalendarMonth } from 'react-icons/md';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import useAxiosPrivate from '../../api/useAxiosPrivate';
import { postingsApi } from '../../api/postings';
import { applicationsApi } from '../../api/applications';
import { interviewsApi } from '../../api/interviews';

const STATUSES = ['NEW', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'];

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

export const PipelinePage = () => {
  const axios = useAxiosPrivate();
  const pApi = postingsApi(axios);
  const appApi = applicationsApi(axios);

  const [postings, setPostings] = useState([]);
  const [selectedPosting, setSelectedPosting] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scheduleApp, setScheduleApp] = useState(null);

  useEffect(() => {
    pApi.getAll({ status: 'PUBLISHED', size: 100 })
      .then((r) => setPostings(r.data.content || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedPosting) return;
    setLoading(true);
    appApi.getByPosting(selectedPosting)
      .then((r) => setApplications(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedPosting]);

  const updateStatus = async (appId, status) => {
    await appApi.updateStatus(appId, { status });
    setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, status } : a));
  };

  const byStatus = (status) => applications.filter((a) => a.status === status);

  return (
    <div className="p-6">
      <PageHeader title="Pipeline de recrutement" subtitle="Suivi des candidatures par statut" />

      <div className="mb-6">
        <select
          value={selectedPosting || ''}
          onChange={(e) => setSelectedPosting(e.target.value)}
          className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white min-w-[280px]"
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {STATUSES.map((status) => (
            <div key={status} className="flex flex-col gap-2">
              <div className="flex items-center justify-between mb-1">
                <StatusBadge status={status} />
                <span className="text-xs text-slate-400">{byStatus(status).length}</span>
              </div>
              {byStatus(status).map((app) => (
                <div key={app.id} className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-3 text-sm shadow-sm">
                  <p className="font-medium text-slate-900 dark:text-white text-xs truncate">
                    {app.candidateFirstName} {app.candidateLastName}
                  </p>
                  {app.aiScore != null && (
                    <p className="text-xs text-slate-400 mt-1">Score: {app.aiScore}/100</p>
                  )}
                  <div className="mt-2 space-y-1">
                    <select
                      value={app.status}
                      onChange={(e) => updateStatus(app.id, e.target.value)}
                      className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded px-1 py-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {app.status === 'INTERVIEW' && (
                      <button
                        onClick={() => setScheduleApp(app)}
                        className="w-full flex items-center justify-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <MdCalendarMonth className="w-3 h-3" /> Entretien
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
    </div>
  );
};
