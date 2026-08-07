import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  MdArrowBack, MdPlayArrow, MdClose, MdAutoAwesome,
  MdStar, MdRefresh, MdContentCopy, MdDownload, MdAdd, MdEdit, MdCheck,
  MdUploadFile, MdCheckCircle, MdError, MdDelete, MdWarning,
} from 'react-icons/md';
import { StatusBadge } from '../../components/StatusBadge';
import useAxiosPrivate from '../../api/useAxiosPrivate';
import { postingsApi } from '../../api/postings';
import { applicationsApi } from '../../api/applications';
import { filterApi } from '../../api/filter';
import { usePageBack } from '../../context/HeaderContext';
import { useToast } from '../../context/ToastContext';

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

const WEIGHT_LABELS = ['', 'Normal', 'Important', 'Critique'];
const WEIGHT_COLORS = ['', 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300', 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'];

const SkillsWeightGrid = ({ posting, onSave }) => {
  const parseSkills = (raw) => {
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  };

  const [editing, setEditing] = useState(false);
  const [skills, setSkills] = useState(() => parseSkills(posting.skillsWeights));
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const addSkill = () => {
    const name = newName.trim();
    if (!name) return;
    setSkills((prev) => [...prev, { name, weight: 1 }]);
    setNewName('');
  };

  const removeSkill = (i) => setSkills((prev) => prev.filter((_, idx) => idx !== i));

  const cycleWeight = (i) =>
    setSkills((prev) => prev.map((s, idx) => idx === i ? { ...s, weight: (s.weight % 3) + 1 } : s));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(JSON.stringify(skills));
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const displaySkills = editing ? skills : parseSkills(posting.skillsWeights);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-900 dark:text-white">Compétences requises</h3>
        {!editing ? (
          <button
            onClick={() => { setSkills(parseSkills(posting.skillsWeights)); setEditing(true); }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <MdEdit className="w-3.5 h-3.5" /> Modifier
          </button>
        ) : (
          <div className="flex gap-1.5">
            <button
              onClick={() => setEditing(false)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-500"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              <MdCheck className="w-3.5 h-3.5" />{saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        )}
      </div>

      {displaySkills.length === 0 && !editing && (
        <p className="text-xs text-slate-400 italic">Aucune compétence définie. Cliquez sur Modifier pour en ajouter.</p>
      )}

      <div className="flex flex-wrap gap-2">
        {displaySkills.map((s, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${WEIGHT_COLORS[s.weight] || WEIGHT_COLORS[1]}`}>
              {s.name}
              <span className="opacity-60 text-[10px]">{WEIGHT_LABELS[s.weight] || ''}</span>
            </span>
            {editing && (
              <>
                <button
                  onClick={() => cycleWeight(i)}
                  title="Changer l'importance"
                  className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-blue-600 flex items-center justify-center text-[10px] font-bold"
                >
                  {s.weight}
                </button>
                <button
                  onClick={() => removeSkill(i)}
                  className="w-5 h-5 rounded-full bg-red-50 dark:bg-red-950 text-red-400 hover:text-red-600 flex items-center justify-center"
                >
                  <MdClose className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <div className="flex gap-2 mt-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSkill()}
            placeholder="Nouvelle compétence…"
            className="flex-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
          <button
            onClick={addSkill}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
          >
            <MdAdd className="w-3.5 h-3.5" /> Ajouter
          </button>
        </div>
      )}

      {editing && (
        <p className="text-[10px] text-slate-400 mt-2">Cliquez sur le badge numéroté pour changer l'importance : 1 Normal · 2 Important · 3 Critique</p>
      )}
    </div>
  );
};

const FilterCriteriaPanel = ({ posting, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState({ minAge: '', maxAge: '', freeFilterPrompt: '' });
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setFields({
      minAge: posting.minAge ?? '',
      maxAge: posting.maxAge ?? '',
      freeFilterPrompt: posting.freeFilterPrompt ?? '',
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        minAge: fields.minAge !== '' ? Number(fields.minAge) : null,
        maxAge: fields.maxAge !== '' ? Number(fields.maxAge) : null,
        freeFilterPrompt: fields.freeFilterPrompt || null,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const hasData = posting.minAge || posting.maxAge || posting.freeFilterPrompt || posting.extractedJobData;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <MdAutoAwesome className="w-4 h-4 text-violet-500" />
          Critères de filtrage IA
        </h3>
        {!editing ? (
          <button onClick={startEdit}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <MdEdit className="w-3.5 h-3.5" /> Modifier
          </button>
        ) : (
          <div className="flex gap-1.5">
            <button onClick={() => setEditing(false)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-500">
              Annuler
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50">
              <MdCheck className="w-3.5 h-3.5" />{saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        )}
      </div>

      {/* Extracted job data badge */}
      {posting.extractedJobData && (() => {
        try {
          const d = JSON.parse(posting.extractedJobData);
          return (
            <div className="mb-3 p-3 bg-violet-50 dark:bg-violet-950/30 rounded-xl border border-violet-100 dark:border-violet-900">
              <p className="text-xs font-semibold text-violet-700 dark:text-violet-300 mb-1.5">
                Données extraites de la fiche de poste
              </p>
              {d.required_skills?.length > 0 && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                  <span className="font-medium">Compétences :</span> {d.required_skills.slice(0, 8).join(', ')}
                  {d.required_skills.length > 8 && ` +${d.required_skills.length - 8}`}
                </p>
              )}
              {d.tools?.length > 0 && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                  <span className="font-medium">Outils :</span> {d.tools.join(', ')}
                </p>
              )}
              {d.required_education && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                  <span className="font-medium">Formation :</span> {d.required_education}
                </p>
              )}
              {d.required_experience && (
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-medium">Expérience :</span> {d.required_experience}
                </p>
              )}
            </div>
          );
        } catch { return null; }
      })()}

      {!editing ? (
        !hasData ? (
          <p className="text-xs text-slate-400 italic">
            Aucun critère défini. Importez une fiche de poste ou cliquez sur Modifier.
          </p>
        ) : (
          <div className="space-y-1.5">
            {(posting.minAge || posting.maxAge) && (
              <p className="text-xs text-slate-600 dark:text-slate-400">
                <span className="font-medium">Tranche d'âge :</span>{' '}
                {posting.minAge && `${posting.minAge} ans min`}
                {posting.minAge && posting.maxAge && ' — '}
                {posting.maxAge && `${posting.maxAge} ans max`}
              </p>
            )}
            {posting.freeFilterPrompt && (
              <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                <span className="font-medium">Instructions libres :</span> {posting.freeFilterPrompt}
              </p>
            )}
          </div>
        )
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Âge min</label>
              <input type="number" min={18} max={99}
                value={fields.minAge}
                onChange={(e) => setFields((p) => ({ ...p, minAge: e.target.value }))}
                placeholder="ex : 25"
                className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Âge max</label>
              <input type="number" min={18} max={99}
                value={fields.maxAge}
                onChange={(e) => setFields((p) => ({ ...p, maxAge: e.target.value }))}
                placeholder="ex : 45"
                className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Instructions supplémentaires pour l'IA
            </label>
            <textarea
              value={fields.freeFilterPrompt}
              onChange={(e) => setFields((p) => ({ ...p, freeFilterPrompt: e.target.value }))}
              rows={3}
              placeholder="ex : Privilégier les candidats avec expérience en secteur bancaire…"
              className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};

const ImportCvsModal = ({ postingId, pApi, onClose, onSuccess }) => {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = (incoming) => {
    const pdfs = [...incoming].filter((f) => f.type === 'application/pdf');
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      return [...prev, ...pdfs.filter((f) => !existing.has(f.name))];
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    try {
      const res = await pApi.importCvs(postingId, files);
      setResults(res.data);
      onSuccess();
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <MdUploadFile className="w-5 h-5 text-blue-500" />
            Importer des CVs candidats
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800">
            <MdClose className="w-5 h-5" />
          </button>
        </div>

        {!results ? (
          <div className="p-5 space-y-4">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/30'
                  : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <MdUploadFile className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Glisser-déposer des PDFs ici
              </p>
              <p className="text-xs text-slate-400 mt-1">ou cliquez pour sélectionner</p>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept="application/pdf"
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
            </div>

            {files.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <span className="text-xs text-slate-700 dark:text-slate-300 truncate">{f.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setFiles((p) => p.filter((_, idx) => idx !== i)); }}
                      className="ml-2 text-slate-400 hover:text-red-500 shrink-0"
                    >
                      <MdClose className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 justify-end pt-1">
              <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white">
                Annuler
              </button>
              <button
                onClick={handleUpload}
                disabled={!files.length || uploading}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Import en cours…
                  </>
                ) : (
                  <>
                    <MdUploadFile className="w-4 h-4" />
                    Importer {files.length > 0 && `(${files.length})`}
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {results.filter((r) => r.application).length} CV{results.length !== 1 ? 's' : ''} importé{results.length !== 1 ? 's' : ''} sur {results.length}
            </p>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {results.map((r, i) => (
                r.application ? (
                  <div key={i} className={`flex flex-col gap-0.5 px-3 py-1.5 rounded-lg ${r.aiError ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-emerald-50 dark:bg-emerald-950/30'}`}>
                    <div className="flex items-center gap-2">
                      {r.aiError
                        ? <MdWarning className="w-4 h-4 text-amber-500 shrink-0" />
                        : <MdCheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      }
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {r.application.candidateFirstName} {r.application.candidateLastName}
                      </span>
                      <StatusBadge status={r.application.status} />
                    </div>
                    {r.aiError && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 pl-6">{r.aiError}</p>
                    )}
                  </div>
                ) : (
                  <div key={i} className="flex flex-col gap-0.5 px-3 py-1.5 bg-red-50 dark:bg-red-950/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <MdError className="w-4 h-4 text-red-500 shrink-0" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">{r.fileName}</span>
                    </div>
                    <p className="text-xs text-red-600 dark:text-red-400 pl-6">{r.aiError}</p>
                  </div>
                )
              ))}
            </div>
            <div className="flex justify-end pt-1">
              <button onClick={onClose} className="px-4 py-2 bg-slate-700 text-white rounded-xl text-sm font-semibold hover:bg-slate-800">
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const PostingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const axios = useAxiosPrivate();
  const { showToast } = useToast();

  const backTo = location.state?.from || '/app/postings';

  usePageBack(
    <button
      onClick={() => navigate(backTo)}
      className="flex items-center gap-1 px-2 py-1 sm:gap-1.5 sm:px-3 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
    >
      <MdArrowBack className="w-4 h-4" />
      Retour
    </button>
  );
  const pApi = postingsApi(axios);
  const appApi = applicationsApi(axios);
  const fApi = filterApi(axios);

  const [posting, setPosting] = useState(null);
  const [applications, setApplications] = useState([]);
  const [filterJobs, setFilterJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteApp, setConfirmDeleteApp] = useState(null); // { id, name }
  const [deletingApp, setDeletingApp] = useState(false);
  const [activeFilterJob, setActiveFilterJob] = useState(null);
  const [generatingFiche, setGeneratingFiche] = useState(false);
  const [ficheUploading, setFicheUploading] = useState(false);
  const [ficheGenerating, setFicheGenerating] = useState(false);
  const [ficheDragOver, setFicheDragOver] = useState(false);
  const ficheFileRef = useRef(null);
  const pollRef = useRef(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startPolling = (filterJobId) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fApi.getFilterJob(filterJobId);
        const job = res.data;
        setActiveFilterJob(job);
        if (job.status === 'DONE' || job.status === 'FAILED') {
          stopPolling();
          appApi.getByPosting(id)
            .then((r) => setApplications(r.data || []))
            .catch(console.error);
        }
      } catch (e) {
        console.error('Filter poll error:', e);
      }
    }, 3000);
  };

  useEffect(() => () => stopPolling(), []);

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
        const latest = (fj.data || [])[0];
        if (latest && (latest.status === 'RUNNING' || latest.status === 'PENDING') && !pollRef.current) {
          setActiveFilterJob(latest);
          startPolling(latest.id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleFicheUpload = async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext)) return;
    setFicheUploading(true);
    try {
      await pApi.uploadFicheFonction(id, file);
      load();
      showToast('Fiche de poste importée avec succès');
    } catch (e) {
      console.error(e);
      showToast("Erreur lors de l'import de la fiche", 'error');
    } finally {
      setFicheUploading(false);
    }
  };

  const handleFicheGenerate = async () => {
    setFicheGenerating(true);
    try {
      await pApi.generateFicheFonction(id);
      load();
      showToast('Fiche de poste générée avec succès');
    } catch (e) {
      console.error(e);
      showToast('Erreur lors de la génération de la fiche', 'error');
    } finally {
      setFicheGenerating(false);
    }
  };

  const handlePublish = () => pApi.publish(id).then(() => { load(); showToast('Offre publiée avec succès'); }).catch(() => showToast('Erreur lors de la publication', 'error'));
  const handleClose  = () => pApi.close(id).then(() => { load(); showToast('Offre clôturée'); }).catch(() => showToast('Erreur lors de la clôture', 'error'));

  const handleSaveSkills = async (skillsWeightsJson) => {
    try {
      await pApi.update(id, { skillsWeights: skillsWeightsJson });
      load();
      showToast('Grille de compétences enregistrée');
    } catch (e) {
      console.error(e);
      showToast("Erreur lors de l'enregistrement", 'error');
    }
  };

  const handleFilter = async () => {
    setFiltering(true);
    try {
      const res = await fApi.requestFilter(id);
      setActiveFilterJob(res.data);
      startPolling(res.data.id);
      showToast('Filtrage IA lancé', 'info');
    } catch (e) {
      console.error(e);
      showToast('Erreur lors du lancement du filtrage', 'error');
    } finally {
      setFiltering(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await pApi.delete(id);
      navigate('/app/postings');
    } catch (e) {
      console.error(e);
      showToast("Erreur lors de la suppression de l'offre", 'error');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleDeleteApp = async () => {
    if (!confirmDeleteApp) return;
    setDeletingApp(true);
    try {
      await appApi.delete(confirmDeleteApp.id);
      setConfirmDeleteApp(null);
      load();
      showToast('Candidature supprimée');
    } catch (e) {
      console.error(e);
      showToast('Erreur lors de la suppression de la candidature', 'error');
    } finally {
      setDeletingApp(false);
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
                onClick={() => setImportOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors shadow-sm"
              >
                <MdUploadFile className="w-4 h-4" />
                Importer des CVs
              </button>
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
            onClick={async () => {
              setGeneratingFiche(true);
              try {
                const res = await pApi.exportFicheFonction(id);
                const url = URL.createObjectURL(res.data);
                Object.assign(document.createElement('a'), { href: url, download: `fiche-fonction-${id}.docx` }).click();
                URL.revokeObjectURL(url);
              } finally {
                setGeneratingFiche(false);
              }
            }}
            disabled={generatingFiche}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {generatingFiche ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Génération en cours…
              </>
            ) : (
              <>
                <MdAutoAwesome className="w-4 h-4" />
                Fiche de fonction
              </>
            )}
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-2 rounded-xl border border-red-200 dark:border-red-900 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            title="Supprimer l'offre"
          >
            <MdDelete className="w-4 h-4" />
          </button>
          <button onClick={load} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <MdRefresh className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Live filter job banner */}
      {activeFilterJob && (
        activeFilterJob.status === 'RUNNING' || activeFilterJob.status === 'PENDING' ? (
          <div className="flex items-center gap-4 rounded-2xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40 p-4 shadow-sm">
            <div className="w-6 h-6 border-[3px] border-violet-200 dark:border-violet-800 border-t-violet-600 dark:border-t-violet-400 rounded-full animate-spin shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-violet-800 dark:text-violet-200">
                Filtrage IA en cours…
              </p>
              <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">
                Les candidats sont en cours d'évaluation. Les résultats s'afficheront automatiquement.
              </p>
            </div>
          </div>
        ) : activeFilterJob.status === 'DONE' ? (
          <div className="flex items-center gap-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-4 shadow-sm">
            <MdCheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                Filtrage terminé
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                Les candidats ont été classés et les statuts mis à jour automatiquement.
              </p>
            </div>
            <button
              onClick={() => setActiveFilterJob(null)}
              className="p-1 rounded-lg text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors shrink-0"
            >
              <MdClose className="w-4 h-4" />
            </button>
          </div>
        ) : activeFilterJob.status === 'FAILED' ? (
          <div className="flex items-center gap-4 rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-4 shadow-sm">
            <MdError className="w-6 h-6 text-red-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-800 dark:text-red-200">Filtrage échoué</p>
              {activeFilterJob.errorMessage && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{activeFilterJob.errorMessage}</p>
              )}
            </div>
            <button
              onClick={() => setActiveFilterJob(null)}
              className="p-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900 transition-colors shrink-0"
            >
              <MdClose className="w-4 h-4" />
            </button>
          </div>
        ) : null
      )}

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

          {/* Fiche de poste — upload / generate when missing */}
          {!posting.extractedJobData && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-800 p-5 shadow-sm">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                <MdUploadFile className="w-4 h-4 text-amber-500" />
                Fiche de poste manquante
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Importez ou générez une fiche de poste pour activer le filtrage IA des candidats.
              </p>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setFicheDragOver(true); }}
                onDragLeave={() => setFicheDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setFicheDragOver(false); handleFicheUpload(e.dataTransfer.files[0]); }}
                onClick={() => !ficheUploading && ficheFileRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-2 px-4 py-5 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  ficheDragOver
                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-950'
                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {ficheUploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-blue-400/40 border-t-blue-500 rounded-full animate-spin" />
                    <p className="text-sm text-blue-600 dark:text-blue-400">Envoi en cours…</p>
                  </>
                ) : (
                  <>
                    <MdUploadFile className="w-6 h-6 text-slate-400" />
                    <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
                      <span className="font-medium text-blue-600 dark:text-blue-400">Importer</span> ou glisser une fiche de poste
                    </p>
                    <p className="text-xs text-slate-400">PDF, DOC, DOCX</p>
                  </>
                )}
                <input
                  ref={ficheFileRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => handleFicheUpload(e.target.files[0])}
                />
              </div>

              <div className="flex items-center gap-3 my-3">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                <span className="text-xs text-slate-400">ou</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              </div>

              <button
                onClick={handleFicheGenerate}
                disabled={ficheGenerating || ficheUploading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-50 dark:bg-violet-950 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 rounded-xl text-sm font-medium hover:bg-violet-100 dark:hover:bg-violet-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {ficheGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-violet-400/40 border-t-violet-500 rounded-full animate-spin" />
                    Génération IA en cours…
                  </>
                ) : (
                  <>
                    <MdAutoAwesome className="w-4 h-4" />
                    Générer la fiche de poste avec l'IA
                  </>
                )}
              </button>
            </div>
          )}

          <SkillsWeightGrid posting={posting} onSave={handleSaveSkills} />

          <FilterCriteriaPanel posting={posting} onSave={async (patch) => { await pApi.update(id, patch); load(); }} />

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
                  <div key={app.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-sm font-medium text-slate-900 dark:text-white truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                          onClick={() => navigate(`/app/candidates/${app.candidateId}`, { state: { from: `/app/postings/${id}`, fromLabel: posting.title } })}
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
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteApp({ id: app.id, name: `${app.candidateFirstName} ${app.candidateLastName}` }); }}
                          className="opacity-0 group-hover:opacity-100 mt-1 p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                          title="Retirer de l'offre"
                        >
                          <MdDelete className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-950 rounded-xl">
                <MdWarning className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Supprimer l'offre</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              Voulez-vous vraiment supprimer <span className="font-semibold text-slate-900 dark:text-white">"{posting.title}"</span> ?
            </p>
            <p className="text-xs text-red-500 mb-5">
              Cette action est irréversible. Toutes les candidatures associées seront également supprimées.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete(false)}
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
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-950 rounded-xl">
                <MdWarning className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Retirer le candidat</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              Voulez-vous retirer <span className="font-semibold text-slate-900 dark:text-white">"{confirmDeleteApp.name}"</span> de cette offre ?
            </p>
            <p className="text-xs text-slate-400 mb-5">
              Le candidat restera dans le système mais sa candidature pour ce poste sera supprimée.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDeleteApp(null)}
                disabled={deletingApp}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteApp}
                disabled={deletingApp}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deletingApp ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <MdDelete className="w-4 h-4" />
                )}
                Retirer
              </button>
            </div>
          </div>
        </div>
      )}

      {importOpen && (
        <ImportCvsModal
          postingId={id}
          pApi={pApi}
          onClose={() => setImportOpen(false)}
          onSuccess={() => { load(); }}
        />
      )}
    </div>
  );
};
