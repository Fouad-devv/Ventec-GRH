import { useState } from 'react';
import { MdClose, MdUploadFile, MdAutoAwesome, MdCheckCircle } from 'react-icons/md';
import { candidatesApi } from '../../api/candidates';

export const CreateCandidateModal = ({ onClose, onCreated, axios }) => {
  const api = candidatesApi(axios);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', linkedinUrl: '', location: '',
  });
  const [cvFile, setCvFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleCvChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCvFile(file);
      setExtracted(false);
    }
  };

  const handleExtract = async () => {
    if (!cvFile) return;
    setExtracting(true);
    setError('');
    try {
      const res = await api.extractCv(cvFile);
      const data = res.data;
      setForm((f) => ({
        ...f,
        location: data.location || f.location,
      }));
      setExtracted(true);
    } catch {
      setError("Impossible d'extraire les données du CV. Vérifiez que le fichier est un PDF valide.");
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      if (cvFile) fd.append('cv', cvFile);
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      await api.create(fd);
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg mx-4 shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Ajouter un candidat</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <MdClose className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* CV upload + AI extract */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              CV (PDF)
            </label>
            <label className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:border-blue-400 transition-colors">
              <MdUploadFile className="w-5 h-5 text-slate-400 shrink-0" />
              <span className="text-sm text-slate-500 dark:text-slate-400 truncate">
                {cvFile ? cvFile.name : 'Cliquer pour uploader'}
              </span>
              <input type="file" accept=".pdf" className="hidden" onChange={handleCvChange} />
            </label>

            {cvFile && (
              <button
                type="button"
                onClick={handleExtract}
                disabled={extracting}
                className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 bg-violet-50 dark:bg-violet-950 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 rounded-lg text-sm font-medium hover:bg-violet-100 dark:hover:bg-violet-900 disabled:opacity-50 transition-colors"
              >
                {extracting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-violet-400 border-t-violet-700 rounded-full animate-spin" />
                    Extraction en cours…
                  </>
                ) : extracted ? (
                  <>
                    <MdCheckCircle className="w-4 h-4 text-emerald-500" />
                    Données extraites — relancer l'IA
                  </>
                ) : (
                  <>
                    <MdAutoAwesome className="w-4 h-4" />
                    Extraire les données avec l'IA
                  </>
                )}
              </button>
            )}

            {extracted && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                Localisation auto-remplie depuis le CV. Complétez les autres champs.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Prénom *</label>
              <input required value={form.firstName} onChange={set('firstName')}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nom *</label>
              <input required value={form.lastName} onChange={set('lastName')}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
            <input type="email" value={form.email} onChange={set('email')}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Téléphone</label>
              <input value={form.phone} onChange={set('phone')}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ville</label>
              <input value={form.location} onChange={set('location')}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">LinkedIn</label>
            <input value={form.linkedinUrl} onChange={set('linkedinUrl')}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
