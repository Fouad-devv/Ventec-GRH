import { useRef, useState } from 'react';
import { MdClose, MdAutoAwesome, MdUploadFile, MdInsertDriveFile, MdCheck } from 'react-icons/md';
import { postingsApi } from '../../api/postings';

const CONTRACT_TYPES = ['CDI', 'CDD', 'STAGE', 'FREELANCE'];

export const CreatePostingModal = ({ onClose, onCreated, axios }) => {
  const api = postingsApi(axios);
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    title: '', department: '', location: '', contractType: 'CDI', minExperience: '',
  });
  const [ficheFonction, setFicheFonction] = useState(null); // uploaded File
  const [generateAI, setGenerateAI] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState(''); // '' | 'creating' | 'uploading' | 'generating'
  const [error, setError] = useState('');

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleFile = (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext)) {
      setError('Format non supporté. Utilisez PDF ou DOCX.');
      return;
    }
    setFicheFonction(file);
    setGenerateAI(false);
    setError('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Step 1 — create posting
      setStep('creating');
      const res = await api.create({
        title: form.title,
        department: form.department || null,
        location: form.location || null,
        contractType: form.contractType || null,
        minExperience: form.minExperience ? Number(form.minExperience) : null,
      });
      const postingId = res.data.id;

      // Step 2 — fiche de fonction
      if (ficheFonction) {
        setStep('uploading');
        await api.uploadFicheFonction(postingId, ficheFonction);
      } else if (generateAI) {
        setStep('generating');
        await api.generateFicheFonction(postingId);
      }

      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création.');
      setStep('');
    }
  };

  const isBusy = step !== '';
  const stepLabel = step === 'creating' ? 'Création…'
    : step === 'uploading' ? 'Envoi de la fiche…'
    : step === 'generating' ? 'Génération IA en cours…'
    : 'Créer';

  const inp = (key, label, placeholder, required, type = 'text') => (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        {label}{required && ' *'}
      </label>
      <input
        type={type}
        required={required}
        value={form[key]}
        onChange={set(key)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg mx-4 shadow-xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Nouvelle offre d'emploi</h2>
          <button onClick={onClose} disabled={isBusy}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 disabled:opacity-40">
            <MdClose className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 space-y-4">

          {/* Basic fields */}
          {inp('title', 'Titre', 'ex : Ingénieur développement logiciel', true)}

          <div className="grid grid-cols-2 gap-3">
            {inp('department', 'Département', 'ex : IT, Finance…')}
            {inp('location', 'Localisation', 'ex : Alger, Télétravail…')}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type de contrat</label>
              <select value={form.contractType} onChange={set('contractType')}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                {CONTRACT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            {inp('minExperience', 'Expérience min (ans)', '0', false, 'number')}
          </div>

          {/* Fiche de poste section */}
          <div className="pt-1">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-0.5">Fiche de poste</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Utilisée par l'IA pour le filtrage et le scoring des candidats.
            </p>

            {/* File already selected */}
            {ficheFonction ? (
              <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl">
                <MdInsertDriveFile className="w-5 h-5 text-blue-500 shrink-0" />
                <span className="text-sm text-blue-700 dark:text-blue-300 truncate flex-1">{ficheFonction.name}</span>
                <button type="button" onClick={() => setFicheFonction(null)}
                  className="text-blue-400 hover:text-red-500 transition-colors">
                  <MdClose className="w-4 h-4" />
                </button>
              </div>
            ) : generateAI ? (
              /* AI generate selected */
              <div className="flex items-center gap-3 px-4 py-3 bg-violet-50 dark:bg-violet-950 border border-violet-200 dark:border-violet-800 rounded-xl">
                <MdAutoAwesome className="w-5 h-5 text-violet-500 shrink-0" />
                <span className="text-sm text-violet-700 dark:text-violet-300 flex-1">
                  Fiche de poste générée par l'IA après création
                </span>
                <button type="button" onClick={() => setGenerateAI(false)}
                  className="text-violet-400 hover:text-red-500 transition-colors">
                  <MdClose className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* Neither selected — show options */
              <>
                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                  className={`flex flex-col items-center justify-center gap-2 px-4 py-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                    dragging
                      ? 'border-blue-400 bg-blue-50 dark:bg-blue-950'
                      : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <MdUploadFile className="w-7 h-7 text-slate-400" />
                  <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
                    <span className="font-medium text-blue-600 dark:text-blue-400">Importer</span> ou glisser une fiche de poste
                  </p>
                  <p className="text-xs text-slate-400">PDF, DOC, DOCX</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files[0])}
                  />
                </div>

                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                  <span className="text-xs text-slate-400">ou</span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                </div>

                <button
                  type="button"
                  onClick={() => setGenerateAI(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-50 dark:bg-violet-950 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 rounded-xl text-sm font-medium hover:bg-violet-100 dark:hover:bg-violet-900 transition-colors"
                >
                  <MdAutoAwesome className="w-4 h-4" />
                  Générer la fiche de poste avec l'IA
                </button>
              </>
            )}
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={isBusy}
              className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40">
              Annuler
            </button>
            <button type="submit" disabled={isBusy}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
              {isBusy ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {stepLabel}
                </>
              ) : (
                <><MdCheck className="w-4 h-4" /> Créer</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
