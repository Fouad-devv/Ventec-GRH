import { useEffect, useState } from 'react';
import { MdAdd, MdCheck, MdClose } from 'react-icons/md';
import { PageHeader } from '../../components/PageHeader';
import useAxiosPrivate from '../../api/useAxiosPrivate';
import { candidatesApi } from '../../api/candidates';
import { postingsApi } from '../../api/postings';
import { checklistsApi } from '../../api/checklists';

const DEFAULT_DOCS = [
  { name: 'CV', required: true, received: false },
  { name: 'Lettre de motivation', required: false, received: false },
  { name: 'Diplôme', required: true, received: false },
  { name: 'Pièce d\'identité', required: true, received: false },
];

export const DocumentsPage = () => {
  const axios = useAxiosPrivate();
  const cApi = candidatesApi(axios);
  const pApi = postingsApi(axios);
  const clApi = checklistsApi(axios);

  const [candidates, setCandidates] = useState([]);
  const [postings, setPostings] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [selectedPosting, setSelectedPosting] = useState('');
  const [checklist, setChecklist] = useState(null);
  const [docs, setDocs] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      cApi.getAll({ size: 200 }),
      pApi.getAll({ size: 200 }),
    ]).then(([c, p]) => {
      setCandidates(c.data.content || []);
      setPostings(p.data.content || []);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedCandidate || !selectedPosting) { setChecklist(null); setDocs([]); return; }
    clApi.getOrCreate(selectedCandidate, selectedPosting)
      .then((r) => {
        setChecklist(r.data);
        try { setDocs(JSON.parse(r.data.documents || '[]')); }
        catch { setDocs(DEFAULT_DOCS); }
      }).catch(console.error);
  }, [selectedCandidate, selectedPosting]);

  const toggleReceived = (idx) => {
    setDocs((prev) => prev.map((d, i) => i === idx ? { ...d, received: !d.received } : d));
  };

  const save = async () => {
    setSaving(true);
    try {
      await clApi.update(selectedCandidate, selectedPosting, { documents: JSON.stringify(docs) });
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const addDoc = () => setDocs((prev) => [...prev, { name: '', required: false, received: false }]);

  return (
    <div className="p-6">
      <PageHeader title="Dossiers candidats" subtitle="Suivi des documents reçus" />

      <div className="flex gap-3 mb-6">
        <select value={selectedCandidate} onChange={(e) => setSelectedCandidate(e.target.value)}
          className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white min-w-[220px]">
          <option value="">— Candidat —</option>
          {candidates.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
        </select>
        <select value={selectedPosting} onChange={(e) => setSelectedPosting(e.target.value)}
          className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white min-w-[220px]">
          <option value="">— Offre —</option>
          {postings.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      </div>

      {!selectedCandidate || !selectedPosting ? (
        <div className="text-center py-20 text-slate-400">Sélectionnez un candidat et une offre</div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 max-w-2xl">
          <div className="space-y-3 mb-6">
            {docs.map((doc, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <button
                  onClick={() => toggleReceived(idx)}
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
                <span className="text-xs text-slate-400">{doc.required ? 'Requis' : 'Optionnel'}</span>
                <button onClick={() => setDocs((prev) => prev.filter((_, i) => i !== idx))}
                  className="p-1 text-slate-400 hover:text-red-500">
                  <MdClose className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={addDoc}
              className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline">
              <MdAdd className="w-4 h-4" /> Ajouter un document
            </button>
            <div className="flex-1" />
            <button onClick={save} disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
