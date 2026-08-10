import { useState } from 'react';
import { createPortal } from 'react-dom';
import { MdClose, MdLock, MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { accountApi } from '../api/account';
import { useToast } from '../context/ToastContext';
import useAxiosPrivate from '../api/useAxiosPrivate';

const INPUT_CLS =
  'w-full px-3 py-2.5 pr-10 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors';

function PasswordField({ id, label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={INPUT_CLS}
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          tabIndex={-1}
          aria-label={show ? 'Masquer' : 'Afficher'}
        >
          {show ? <MdVisibilityOff className="w-4 h-4" /> : <MdVisibility className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

export const ChangePasswordModal = ({ onClose }) => {
  const axios = useAxiosPrivate();
  const api = accountApi(axios);
  const { showToast } = useToast();

  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.newPassword.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      await api.changePassword({
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });
      showToast('Mot de passe modifié avec succès.', 'success');
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data || 'Une erreur est survenue.';
      setError(typeof msg === 'string' ? msg : 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Card */}
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-white/[0.08] overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
            <MdLock className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Changer le mot de passe</h2>
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            aria-label="Fermer"
          >
            <MdClose className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          <PasswordField
            id="newPassword"
            label="Nouveau mot de passe"
            value={form.newPassword}
            onChange={set('newPassword')}
            placeholder="Au moins 8 caractères"
          />
          <PasswordField
            id="confirmPassword"
            label="Confirmer le nouveau mot de passe"
            value={form.confirmPassword}
            onChange={set('confirmPassword')}
            placeholder="••••••••"
          />

          {error && (
            <p className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.10] rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !form.newPassword || !form.confirmPassword}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
