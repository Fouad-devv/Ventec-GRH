import { useEffect, useRef, useState } from 'react';
import { MdCalendarMonth, MdStar, MdAutoAwesome, MdDownload, MdClose, MdQuestionAnswer, MdDescription, MdRefresh, MdMail, MdWarning, MdCheckCircle } from 'react-icons/md';
import { useNavigate, useLocation } from 'react-router-dom';
import { StatusBadge } from '../../components/StatusBadge';
import { usePageActions } from '../../context/HeaderContext';
import { useToast } from '../../context/ToastContext';
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

const STATUSES = ['SCREENING', 'SHORTLISTED', 'INTERVIEW_RH', 'INTERVIEW_TECH', 'HIRED', 'REJECTED'];

const VENTEC_OFFICES = [
  { label: 'Siège Casablanca', mapsUrl: 'https://maps.google.com/?cid=9982332426923818859' },
  { label: 'Agence Tanger',    mapsUrl: 'https://maps.google.com/?cid=11718189488849865390' },
  { label: 'Agence Oujda',     mapsUrl: 'https://maps.google.com/?cid=11562274598378832981' },
  { label: 'Agence Agadir',    mapsUrl: 'https://maps.google.com/?cid=6755927573515155458' },
  { label: 'Agence Marrakech', mapsUrl: 'https://maps.google.com/?cid=11071060659319015769' },
  { label: 'Agence Fès',       mapsUrl: 'https://maps.google.com/?cid=2087783074711302950' },
];

// Converts any ISO/UTC date string to the YYYY-MM-DDTHH:mm format a datetime-local input expects,
// using the browser's local time — so "18:53Z" shows as "20:53" in a UTC+2 browser.
const toLocalDatetimeInput = (iso) => {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Converts a datetime-local input value (local time) to an ISO string that carries the
// browser's UTC offset — e.g. "2024-08-05T20:53:00+02:00" — so the backend stores the
// correct OffsetDateTime and the email template formats it in the right timezone.
const toISOWithLocalOffset = (localStr) => {
  const d = new Date(localStr);
  const pad = (n) => String(n).padStart(2, '0');
  const offset = -d.getTimezoneOffset(); // minutes east of UTC (positive for UTC+2)
  const sign = offset >= 0 ? '+' : '-';
  const absOffset = Math.abs(offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00${sign}${pad(Math.floor(absOffset / 60))}:${pad(absOffset % 60)}`;
};

const ScheduleInterviewModal = ({ application, appStatus, onClose, onScheduled, axios }) => {
  const isTech = appStatus === 'INTERVIEW_TECH';
  const api = interviewsApi(axios);
  const { showToast } = useToast();
  const interviewId = application.scheduledInterviewId ?? null;
  const isEdit = !!interviewId;
  const [form, setForm] = useState({ scheduledAt: '', durationMinutes: 60, type: 'VIDEO', locationOrLink: '', notes: '', responsableNom: '', responsableEmail: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!interviewId) return;
    api.get(interviewId).then((r) => {
      const iv = r.data;
      setForm({
        scheduledAt: iv.scheduledAt ? toLocalDatetimeInput(iv.scheduledAt) : '',
        durationMinutes: iv.durationMinutes ?? 60,
        type: iv.type ?? 'VIDEO',
        locationOrLink: iv.locationOrLink ?? '',
        notes: iv.notes ?? '',
        responsableNom: iv.responsableNom ?? '',
        responsableEmail: iv.responsableEmail ?? '',
      });
    }).catch(console.error);
  }, [interviewId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, scheduledAt: toISOWithLocalOffset(form.scheduledAt) };
      if (isEdit) {
        await api.update(interviewId, payload);
      } else {
        await api.schedule({ applicationId: application.id, ...payload });
      }
      showToast(isEdit ? 'Entretien modifié avec succès' : 'Entretien planifié avec succès');
      onScheduled();
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de l'enregistrement de l'entretien", 'error');
    } finally {
      setSaving(false);
    }
  };

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));
  const fieldCls = 'w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md mx-4 shadow-xl p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          {isEdit ? "Modifier l'entretien" : "Planifier un entretien"}
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          {application.candidateFirstName} {application.candidateLastName} — {application.jobPostingTitle}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="datetime-local" required value={form.scheduledAt} onChange={set('scheduledAt')}
            className={fieldCls} />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value, locationOrLink: '' }))}
              className={fieldCls}>
              <option value="VIDEO">Visio</option>
              <option value="PHONE">Téléphone</option>
              <option value="ON_SITE">Présentiel</option>
            </select>
            <input type="number" min={15} value={form.durationMinutes} onChange={set('durationMinutes')}
              placeholder="Durée (min)" className={fieldCls} />
          </div>

          {form.type === 'ON_SITE' ? (
            <select value={form.locationOrLink} onChange={set('locationOrLink')} className={fieldCls}>
              <option value="">-- Sélectionner un site Ventec --</option>
              {VENTEC_OFFICES.map((o) => (
                <option key={o.label} value={o.label}>{o.label}</option>
              ))}
            </select>
          ) : (
            <input
              value={form.locationOrLink}
              onChange={set('locationOrLink')}
              placeholder={form.type === 'VIDEO' ? 'Lien de la réunion (Teams, Meet…)' : 'Numéro de téléphone ou lien'}
              className={fieldCls}
            />
          )}
          {isTech && (
            <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-3">
              <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Responsable technique <span className="text-red-500">*</span></p>
              <input required value={form.responsableNom} onChange={set('responsableNom')} placeholder="Nom complet du responsable"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
              <input required type="email" value={form.responsableEmail} onChange={set('responsableEmail')} placeholder="Email du responsable"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">Annuler</button>
            <button type="submit" disabled={saving}
              className={`flex-1 px-4 py-2 text-white rounded-lg text-sm disabled:opacity-50 ${isEdit ? 'bg-emerald-600' : 'bg-blue-600'}`}>
              {saving ? (isEdit ? 'Modification...' : 'Planification...') : (isEdit ? 'Modifier' : 'Planifier')}
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
  const location = useLocation();
  const pApi = postingsApi(axios);
  const appApi = applicationsApi(axios);
  const { showToast } = useToast();

  const [postings, setPostings] = useState([]);
  const [selectedPosting, setSelectedPosting] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scheduleApp, setScheduleApp] = useState(null);
  const [detailApp, setDetailApp] = useState(null);
  const [showRejectionConfirm, setShowRejectionConfirm] = useState(false);
  const [showInterviewConfirm, setShowInterviewConfirm] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [emailResult, setEmailResult] = useState(null);

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

  // useRef keeps the button in usePageActions (which only mounts once) always calling the latest loadApplications
  const loadRef = useRef();
  loadRef.current = loadApplications;

  usePageActions(
    <button onClick={() => loadRef.current()} className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
      <MdRefresh className="w-4 h-4" /><span className="hidden sm:inline">Actualiser</span>
    </button>
  );

  const updateStatus = async (appId, status) => {
    setUpdatingId(appId);
    try {
      const res = await appApi.updateStatus(appId, { status });
      setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, ...res.data } : a));
      showToast('Statut du candidat mis à jour');
    } catch (e) {
      console.error(e);
      showToast('Erreur lors de la mise à jour du statut', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const downloadDocuments = async (app, format = 'docx') => {
    try {
      const res = format === 'pdf'
        ? await appApi.downloadDocumentsListPdf(app.id)
        : await appApi.downloadDocumentsList(app.id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `liste-documents-${app.candidateFirstName}-${app.candidateLastName}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Téléchargement liste documents échoué', e);
    }
  };

  const handleSendRejectionEmails = async () => {
    if (!selectedPosting) return;
    setSendingEmails(true);
    try {
      const res = await appApi.sendRejectionEmails(selectedPosting);
      setEmailResult({ sent: res.data.sent, noEmail: res.data.noEmail || [], type: 'rejection' });
      setShowRejectionConfirm(false);
      loadApplications();
      showToast(`${res.data.sent} email${res.data.sent > 1 ? 's' : ''} de refus envoyé${res.data.sent > 1 ? 's' : ''}`);
    } catch (e) {
      console.error(e);
      showToast("Erreur lors de l'envoi des emails de refus", 'error');
    } finally {
      setSendingEmails(false);
    }
  };

  const handleSendInterviewNotifications = async () => {
    if (!selectedPosting) return;
    setSendingEmails(true);
    try {
      const res = await appApi.sendInterviewNotifications(selectedPosting);
      const { sent, noInterview, noEmail } = res.data;
      setEmailResult({ sent, noInterview, noEmail: noEmail || [], type: 'interview' });
      setShowInterviewConfirm(false);
      loadApplications();
      showToast(`${sent} responsable${sent > 1 ? 's' : ''} notifié${sent > 1 ? 's' : ''}`);
    } catch (e) {
      console.error(e);
      showToast("Erreur lors de l'envoi des convocations", 'error');
    } finally {
      setSendingEmails(false);
    }
  };

  const byStatus = (status) => applications.filter((a) => a.status === status);

  return (
    <div className="p-4 sm:p-6">

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
        <div className="pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {STATUSES.map((status) => (
            <div key={status} className="flex flex-col gap-2">
              <div className="flex items-center justify-between mb-1">
                <StatusBadge status={status} />
                <span className="text-xs text-slate-400">{byStatus(status).length}</span>
              </div>
              {status === 'INTERVIEW_TECH' && byStatus(status).length > 0 && (() => {
                const pendingInterview = byStatus(status).filter((a) => a.scheduledInterviewId && !a.interviewNotifiedAt);
                const pending = pendingInterview.length;
                const allNotified = pending === 0;
                return (
                  <button
                    onClick={() => { setEmailResult(null); setShowInterviewConfirm(true); }}
                    disabled={allNotified}
                    title={
                      allNotified
                        ? 'Tous les responsables ont déjà été notifiés'
                        : `Notifier le responsable pour ${pending} entretien(s) technique(s)`
                    }
                    className="flex items-center justify-center gap-1 w-full px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-950 border border-cyan-200 dark:border-cyan-900"
                  >
                    <MdMail className="w-3.5 h-3.5 shrink-0" />
                    {allNotified ? 'Responsables notifiés' : `Notifier responsable (${pending})`}
                  </button>
                );
              })()}
              {status === 'REJECTED' && byStatus('REJECTED').length > 0 && (() => {
                const pendingRejection = byStatus('REJECTED').filter((a) => !a.rejectionEmailSentAt);
                const withEmail = pendingRejection.filter((a) => a.candidateEmail).length;
                const noEmail = pendingRejection.length - withEmail;
                const allNotified = pendingRejection.length === 0;
                return (
                  <button
                    onClick={() => { setEmailResult(null); setShowRejectionConfirm(true); }}
                    disabled={withEmail === 0}
                    title={
                      allNotified
                        ? 'Tous les candidats ont déjà été notifiés'
                        : withEmail === 0
                        ? `${noEmail} candidat(s) sans email — impossible d'envoyer des emails de refus`
                        : `Notifier ${withEmail} candidat(s)`
                    }
                    className="flex items-center justify-center gap-1 w-full px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950 border border-red-200 dark:border-red-900"
                  >
                    <MdMail className="w-3.5 h-3.5 shrink-0" />
                    {allNotified ? 'Tous notifiés' : withEmail > 0 ? `Notifier (${withEmail})` : 'Aucun email disponible'}
                  </button>
                );
              })()}
              {byStatus(status).map((app) => (
                <div key={app.id} className={`bg-white dark:bg-slate-900 rounded-lg border p-3 text-sm shadow-sm ${
                  !app.candidateEmail
                    ? 'border-red-300 dark:border-red-700'
                    : (app.status === 'INTERVIEW_RH' || app.status === 'INTERVIEW_TECH') && !app.scheduledInterviewId
                    ? 'border-amber-300 dark:border-amber-700'
                    : 'border-slate-200 dark:border-slate-800'
                }`}>
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <p
                      className="font-medium text-slate-900 dark:text-white text-xs truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                      onClick={() => navigate(`/app/candidates/${app.candidateId}`, { state: { from: location.pathname, fromLabel: 'Pipeline' } })}
                    >
                      {app.candidateFirstName} {app.candidateLastName}
                    </p>
                    <ScoreBadge score={app.aiScore} />
                  </div>
                  {!app.candidateEmail && (
                    <span className="inline-flex items-center gap-0.5 mb-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
                      <MdWarning className="w-2.5 h-2.5" /> Candidat sans email
                    </span>
                  )}
                  {(app.status === 'INTERVIEW_RH' || app.status === 'INTERVIEW_TECH') && !app.scheduledInterviewId && (
                    <span className="inline-flex items-center gap-0.5 mb-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                      <MdWarning className="w-2.5 h-2.5" /> Non planifié
                    </span>
                  )}
                  {app.status === 'INTERVIEW_TECH' && app.interviewNotifiedAt && (
                    <span className="inline-flex items-center gap-0.5 mb-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                      <MdCheckCircle className="w-2.5 h-2.5" /> Responsable notifié
                    </span>
                  )}
                  <div className="mt-2 space-y-1">
                    <div className="relative">
                    <select
                      value={app.status}
                      onChange={(e) => updateStatus(app.id, e.target.value)}
                      disabled={updatingId === app.id}
                      className={`w-full text-xs border border-slate-200 dark:border-slate-700 rounded px-1 py-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition-opacity ${updatingId === app.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s === 'SCREENING' ? 'Présélection'
                            : s === 'SHORTLISTED' ? 'Sélectionné'
                            : s === 'INTERVIEW_RH' ? 'Entretien RH'
                            : s === 'INTERVIEW_TECH' ? 'Entretien Technique'
                            : s === 'HIRED' ? 'Embauché'
                            : s === 'REJECTED' ? 'Rejeté'
                            : s}
                        </option>
                      ))}
                    </select>
                    {updatingId === app.id && (
                      <div className="absolute inset-y-0 right-6 flex items-center pointer-events-none">
                        <div className="w-3 h-3 rounded-full border-2 border-blue-300 border-t-blue-600 animate-spin" />
                      </div>
                    )}
                    </div>
                    {(app.status === 'INTERVIEW_RH' || app.status === 'INTERVIEW_TECH') && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => setScheduleApp(app)}
                          className={`flex-1 flex items-center justify-center gap-1 text-xs hover:underline ${app.scheduledInterviewId ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}
                        >
                          <MdCalendarMonth className="w-3 h-3" />
                          {app.scheduledInterviewId ? 'Modifier' : 'Planifier'}
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
                      <div className="flex flex-col gap-0.5 mt-1">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 text-center">Liste documents</span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => downloadDocuments(app, 'docx')}
                            className="flex-1 flex items-center justify-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                            title="Télécharger en Word"
                          >
                            <MdDescription className="w-3 h-3" /> Word
                          </button>
                          <button
                            onClick={() => downloadDocuments(app, 'pdf')}
                            className="flex-1 flex items-center justify-center gap-1 text-xs text-red-500 dark:text-red-400 hover:underline"
                            title="Télécharger en PDF"
                          >
                            <MdDescription className="w-3 h-3" /> PDF
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        </div>
      )}

      {scheduleApp && (
        <ScheduleInterviewModal
          application={scheduleApp}
          appStatus={scheduleApp.status}
          axios={axios}
          onClose={() => setScheduleApp(null)}
          onScheduled={() => { setScheduleApp(null); loadApplications(); }}
        />
      )}

      {detailApp && (
        <InterviewDetailModal
          application={detailApp}
          axios={axios}
          onClose={() => setDetailApp(null)}
        />
      )}

      {/* Responsable notification confirmation modal */}
      {showInterviewConfirm && (() => {
        const pendingInterview = byStatus('INTERVIEW_TECH').filter((a) => a.scheduledInterviewId && !a.interviewNotifiedAt);
        const pending = pendingInterview.length;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm mx-4 shadow-xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 shrink-0 rounded-full bg-cyan-100 dark:bg-cyan-950 flex items-center justify-center">
                  <MdMail className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">Notifier le responsable technique</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Le responsable technique sera informé par email pour
                    <span className="font-semibold text-slate-700 dark:text-slate-200"> {pending} entretien{pending !== 1 ? 's' : ''}</span> planifié{pending !== 1 ? 's' : ''}.
                    Les entretiens sans responsable configuré seront ignorés.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setShowInterviewConfirm(false)}
                  disabled={sendingEmails}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSendInterviewNotifications}
                  disabled={sendingEmails}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-xl text-sm font-semibold hover:bg-cyan-700 disabled:opacity-50 transition-colors"
                >
                  {sendingEmails ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <MdMail className="w-4 h-4" />
                  )}
                  {sendingEmails ? 'Envoi…' : 'Envoyer'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Rejection email confirmation modal */}
      {showRejectionConfirm && (() => {
        const pendingRejection = byStatus('REJECTED').filter((a) => !a.rejectionEmailSentAt);
        const withEmail = pendingRejection.filter((a) => a.candidateEmail).length;
        const noEmailCount = pendingRejection.length - withEmail;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm mx-4 shadow-xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 shrink-0 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
                  <MdWarning className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">Envoyer les emails de refus</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{withEmail} candidat{withEmail !== 1 ? 's' : ''}</span> recevront un email de refus professionnel.
                    Les candidats déjà notifiés seront ignorés.
                  </p>
                  {noEmailCount > 0 && (
                    <p className="flex items-center gap-1 mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
                      <MdWarning className="w-3.5 h-3.5 shrink-0" />
                      {noEmailCount} candidat{noEmailCount !== 1 ? 's' : ''} sans email {noEmailCount !== 1 ? 'seront ignorés' : 'sera ignoré'}.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setShowRejectionConfirm(false)}
                  disabled={sendingEmails}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSendRejectionEmails}
                  disabled={sendingEmails}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {sendingEmails ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <MdMail className="w-4 h-4" />
                  )}
                  {sendingEmails ? 'Envoi…' : 'Envoyer'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Toast */}
      {emailResult !== null && (
        <div className="fixed bottom-6 right-6 z-50 max-w-xs w-full rounded-xl shadow-xl text-sm font-medium animate-in fade-in slide-in-from-bottom-4 overflow-hidden">
          {/* Success row */}
          {emailResult.sent > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-emerald-600 text-white">
              <MdCheckCircle className="w-5 h-5 shrink-0" />
              <span className="flex-1">
                {emailResult.type === 'interview'
                  ? `${emailResult.sent} responsable${emailResult.sent !== 1 ? 's' : ''} notifié${emailResult.sent !== 1 ? 's' : ''} avec succès.`
                  : `${emailResult.sent} email${emailResult.sent !== 1 ? 's' : ''} de refus envoyé${emailResult.sent !== 1 ? 's' : ''} avec succès.`}
              </span>
              {!emailResult.noEmail?.length && (
                <button onClick={() => setEmailResult(null)} className="opacity-75 hover:opacity-100 shrink-0">
                  <MdClose className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
          {/* No email warning — one entry per candidate */}
          {emailResult.noEmail?.length > 0 && (
            <div className="px-4 py-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold text-xs">
                  <MdWarning className="w-4 h-4 shrink-0" />
                  Pas d'email pour :
                </div>
                <button onClick={() => setEmailResult(null)} className="text-amber-500 opacity-75 hover:opacity-100 shrink-0">
                  <MdClose className="w-4 h-4" />
                </button>
              </div>
              <ul className="space-y-1 ml-5">
                {emailResult.noEmail.map((name, i) => (
                  <li key={i} className="text-amber-800 dark:text-amber-300 text-xs font-semibold">
                    • {name}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* Nothing to send */}
          {emailResult.sent === 0 && !emailResult.noEmail?.length && (
            <div className="flex items-center gap-3 px-4 py-3 bg-amber-500 text-white">
              <MdWarning className="w-5 h-5 shrink-0" />
              <span className="flex-1">
                {emailResult.type === 'interview'
                  ? emailResult.noInterview > 0
                    ? `${emailResult.noInterview} candidat${emailResult.noInterview !== 1 ? 's' : ''} sans entretien planifié — utilisez "Planifier" d'abord.`
                    : 'Tous les candidats ont déjà été convoqués.'
                  : 'Tous les candidats ont déjà été notifiés.'}
              </span>
              <button onClick={() => setEmailResult(null)} className="opacity-75 hover:opacity-100 shrink-0">
                <MdClose className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
