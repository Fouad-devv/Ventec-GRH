import { useRef, useState } from 'react';
import { MdClose, MdUploadFile, MdInsertDriveFile, MdCheck } from 'react-icons/md';
import { postingsApi } from '../../api/postings';

const CONTRACT_TYPES = ['CDI', 'CDD', 'STAGE', 'FREELANCE'];

export const CreatePostingModal = ({ onClose, onCreated, axios }) => {
  const api = postingsApi(axios);
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    title: '', department: '', location: '', contractType: 'CDI',
    minExperience: '', minAge: '', maxAge: '', freeFilterPrompt: '',
  });
  const [ficheFonction, setFicheFonction] = useState(null); // uploaded File
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState(''); // '' | 'creating' | 'uploading'
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
        minAge: form.minAge ? Number(form.minAge) : null,
        maxAge: form.maxAge ? Number(form.maxAge) : null,
        freeFilterPrompt: form.freeFilterPrompt || null,
      });
      const postingId = res.data.id;

      // Step 2 — fiche de poste (optional)
      if (ficheFonction) {
        setStep('uploading');
        await api.uploadFicheFonction(postingId, ficheFonction);
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

          {/* Age range */}
          <div className="grid grid-cols-2 gap-3">
            {inp('minAge', 'Âge min (optionnel)', 'ex : 25', false, 'number')}
            {inp('maxAge', 'Âge max (optionnel)', 'ex : 45', false, 'number')}
          </div>

          {/* Free-form filter prompt */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Critères supplémentaires pour l'IA
            </label>
            <textarea
              value={form.freeFilterPrompt}
              onChange={set('freeFilterPrompt')}
              placeholder="ex : Privilégier les candidats ayant une expérience dans le secteur bancaire et maîtrisant l'arabe…"
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-slate-400 mt-0.5">
              L'IA utilisera ces instructions lors du filtrage des CVs.
            </p>
          </div>

          {/* Fiche de poste section */}
          <div className="pt-1">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-0.5">Fiche de poste <span className="text-slate-400 font-normal">(optionnelle)</span></p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Utilisée par l'IA pour le filtrage et le scoring des candidats. Vous pouvez l'ajouter après la création.
            </p>

            {ficheFonction ? (
              <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl">
                <MdInsertDriveFile className="w-5 h-5 text-blue-500 shrink-0" />
                <span className="text-sm text-blue-700 dark:text-blue-300 truncate flex-1">{ficheFonction.name}</span>
                <button type="button" onClick={() => setFicheFonction(null)}
                  className="text-blue-400 hover:text-red-500 transition-colors">
                  <MdClose className="w-4 h-4" />
                </button>
              </div>
            ) : (
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
