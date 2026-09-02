import { useEffect, useState } from 'react';
import { MdAdd, MdArrowBack, MdCheck, MdClose, MdDownload, MdCheckCircle } from 'react-icons/md';
import { PageHeader } from '../../components/PageHeader';
import useAxiosPrivate from '../../api/useAxiosPrivate';
import { postingsApi } from '../../api/postings';
import { applicationsApi } from '../../api/applications';
import { checklistsApi } from '../../api/checklists';
import { useToast } from '../../context/ToastContext';

const EXCLUDED_DOCS = [
  "bulletin d'adhésion",
  "bulletin adhesion",
  "fiche administrative",
  "contrat de travail",
];
const isExcluded = (name) =>
  EXCLUDED_DOCS.some((p) => name?.toLowerCase().includes(p));

export const DocumentsPage = () => {
  const axios = useAxiosPrivate();
  const pApi = postingsApi(axios);
  const appApi = applicationsApi(axios);
  const clApi = checklistsApi(axios);
  const { showToast } = useToast();

  const [postings, setPostings] = useState([]);
  const [selectedPostingId, setSelectedPostingId] = useState('');
  const [hiredApps, setHiredApps] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);

  const [selectedApp, setSelectedApp] = useState(null);
  const [docs, setDocs] = useState([]);
  const [savedDocs, setSavedDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const isDirty = JSON.stringify(docs) !== JSON.stringify(savedDocs);

  useEffect(() => {
    pApi.getAll({ size: 200 }).then((r) => setPostings(r.data.content || [])).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedPostingId) { setHiredApps([]); setSelectedApp(null); return; }
    setLoadingApps(true);
    setSelectedApp(null);
    setDocs([]);
    appApi.getByPosting(selectedPostingId)
      .then((r) => setHiredApps((r.data || []).filter((a) => a.status === 'HIRED')))
      .catch(console.error)
      .finally(() => setLoadingApps(false));
  }, [selectedPostingId]);

  useEffect(() => {
    if (!selectedApp) { setDocs([]); setSavedDocs([]); return; }
    setLoadingDocs(true);
    clApi.getOrCreate(selectedApp.candidateId, selectedApp.jobPostingId)
      .then((r) => {
        let parsed = [];
        try { parsed = JSON.parse(r.data.documents || '[]'); } catch { parsed = []; }
        const isExperienced = (selectedApp.candidateExperienceYears ?? 0) > 0;
        parsed = parsed
          .filter((doc) => !isExcluded(doc.name))
          .filter((doc) => {
            const n = doc.name?.toLowerCase() ?? '';
            if (isExperienced  && n.includes('attestation de stage'))  return false;
            if (!isExperienced && n.includes('certificat de travail')) return false;
            return true;
          });
        setDocs(parsed);
        setSavedDocs(parsed);
      })
      .catch(console.error)
      .finally(() => setLoadingDocs(false));
  }, [selectedApp]);

  const save = async () => {
    if (!selectedApp) return;
    setSaving(true);
    try {
      await clApi.update(selectedApp.candidateId, selectedApp.jobPostingId, { documents: JSON.stringify(docs) });
      setSavedDocs(docs);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      showToast('Documents enregistrés avec succès');
    } catch (e) {
      console.error(e);
      showToast("Erreur lors de l'enregistrement des documents", 'error');
    } finally { setSaving(false); }
  };

  const download = (type) => {
    const call = type === 'pdf'
      ? appApi.downloadDocumentsListPdf(selectedApp.id)
      : appApi.downloadDocumentsList(selectedApp.id);
    call.then((r) => {
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `liste-documents-${selectedApp.candidateLastName}.${type}`;
      a.click();
      URL.revokeObjectURL(url);
    }).catch(console.error);
  };

  return (
    <div className="p-4 sm:p-6">
      <PageHeader title="Dossiers candidats" subtitle="Suivi des documents des candidats embauchés" />

      <div className="mb-6">
        <select
          value={selectedPostingId}
          onChange={(e) => setSelectedPostingId(e.target.value)}
          className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white w-full sm:w-auto sm:min-w-[320px]"
        >
          <option value="">— Sélectionner une offre d'emploi —</option>
          {postings.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      </div>

      {!selectedPostingId ? (
        <div className="text-center py-24 text-slate-400 text-sm">
          Sélectionnez une offre pour voir les candidats embauchés
        </div>
      ) : loadingApps ? (
        <div className="text-center py-24 text-slate-400 text-sm">Chargement...</div>
      ) : hiredApps.length === 0 ? (
        <div className="text-center py-24 text-slate-400 text-sm">
          Aucun candidat embauché pour cette offre
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-5">
          {/* Candidate list — hidden on mobile when checklist is open */}
          <div className={`sm:w-60 sm:flex-shrink-0 space-y-2 ${selectedApp ? 'hidden sm:block' : 'block'}`}>
            {hiredApps.map((app) => (
              <button
                key={app.id}
                onClick={() => setSelectedApp(app)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                  selectedApp?.id === app.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white hover:border-blue-300 dark:hover:border-blue-700'
                }`}
              >
                <div className="font-medium text-sm truncate">
                  {app.candidateFirstName} {app.candidateLastName}
                </div>
                {app.candidateEmail && (
                  <div className="text-xs text-slate-400 truncate mt-0.5">{app.candidateEmail}</div>
                )}
              </button>
            ))}
          </div>

          {/* Checklist panel */}
          {!selectedApp ? (
            <div className="hidden sm:flex flex-1 items-center justify-center text-slate-400 text-sm">
              Sélectionnez un candidat pour voir sa checklist
            </div>
          ) : loadingDocs ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              Chargement...
            </div>
          ) : (
            <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={() => setSelectedApp(null)}
                    className="sm:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                  >
                    <MdArrowBack className="w-4 h-4" />
                  </button>
                  <h2 className="font-semibold text-slate-900 dark:text-white truncate">
                    {selectedApp.candidateFirstName} {selectedApp.candidateLastName}
                  </h2>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => download('docx')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <MdDownload className="w-3.5 h-3.5" /> DOCX
                  </button>
                  <button
                    onClick={() => download('pdf')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <MdDownload className="w-3.5 h-3.5" /> PDF
                  </button>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {docs.length === 0 && (
                  <p className="text-sm text-slate-400">Aucun document dans la checklist.</p>
                )}
                {docs.map((doc, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <button
                      onClick={() => setDocs((prev) => prev.map((d, i) => i === idx ? { ...d, received: !d.received } : d))}
                      className={`w-6 h-6 rounded flex items-center justify-center border-2 transition-colors flex-shrink-0 ${
                        doc.received
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-slate-300 dark:border-slate-600 text-transparent'
                      }`}
                    >
                      <MdCheck className="w-4 h-4" />
                    </button>
                    <input
                      value={doc.name}
                      onChange={(e) => setDocs((prev) => prev.map((d, i) => i === idx ? { ...d, name: e.target.value } : d))}
                      className="flex-1 text-sm bg-transparent border-b border-slate-200 dark:border-slate-700 py-1 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                    <span className="text-xs text-slate-400 w-16 text-right">
                      {doc.required ? 'Requis' : 'Optionnel'}
                    </span>
                    <button
                      onClick={() => setDocs((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-1 text-slate-400 hover:text-red-500"
                    >
                      <MdClose className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDocs((prev) => [...prev, { name: '', required: false, received: false }])}
                  className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <MdAdd className="w-4 h-4" /> Ajouter un document
                </button>
                <div className="flex-1" />
                <button
                  onClick={save}
                  disabled={saving || !isDirty}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Success toast */}
      {saved && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-emerald-600 text-white text-sm font-medium rounded-xl shadow-xl animate-in fade-in slide-in-from-bottom-4">
          <MdCheckCircle className="w-5 h-5 shrink-0" />
          <span>Checklist enregistrée avec succès.</span>
          <button onClick={() => setSaved(false)} className="opacity-75 hover:opacity-100">
            <MdClose className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
