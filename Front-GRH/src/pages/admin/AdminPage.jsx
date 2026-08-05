import { useEffect, useState } from 'react';
import { MdPersonAdd, MdEdit, MdDelete, MdClose, MdCheck, MdPerson, MdWarning, MdRefresh } from 'react-icons/md';
import useAxiosPrivate from '../../api/useAxiosPrivate';
import { adminApi } from '../../api/admin';
import { usePageActions } from '../../context/HeaderContext';

const ROLES = ['RH', 'MANAGER', 'ADMIN'];

const ROLE_COLORS = {
  RH:      'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  MANAGER: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  ADMIN:   'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
};

/* ── Edit user modal ────────────────────────────────────── */
const EditUserModal = ({ user, onSave, onClose }) => {
  const [form, setForm] = useState({
    firstName:  user.firstName  ?? '',
    lastName:   user.lastName   ?? '',
    role:       user.role       ?? 'RH',
    department: user.department ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try { await onSave(form); onClose(); }
    catch (err) { setError('Erreur lors de la modification.'); }
    finally { setSaving(false); }
  };

  const inp = (key, label, placeholder) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
      <input
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm mx-4 shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Modifier l'utilisateur</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            <MdClose className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {inp('firstName', 'Prénom', 'Mohamed')}
            {inp('lastName',  'Nom',    'Dupont')}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Rôle *</label>
            <select
              required
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {inp('department', 'Département', 'ex : RH, Finance, IT…')}
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
              <MdCheck className="w-4 h-4" />{saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ── Delete confirm modal ───────────────────────────────── */
const DeleteConfirmModal = ({ user, onConfirm, onClose }) => {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    try { await onConfirm(); onClose(); }
    catch (err) { console.error(err); }
    finally { setDeleting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm mx-4 shadow-xl p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
            <MdWarning className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Supprimer l'utilisateur</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Supprimer <span className="font-medium text-slate-700 dark:text-slate-200">{user.firstName} {user.lastName}</span> ?
              Cette action est irréversible et supprime aussi le compte Keycloak.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
            Annuler
          </button>
          <button onClick={handleConfirm} disabled={deleting}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
            <MdDelete className="w-4 h-4" />{deleting ? 'Suppression…' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Add user modal ─────────────────────────────────────── */
const AddUserModal = ({ onSave, onClose }) => {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', role: 'RH', department: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setSaving(true);
    try {
      const { confirmPassword, ...payload } = form;
      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Erreur lors de l'ajout de l'utilisateur.");
    } finally {
      setSaving(false);
    }
  };

  const field = (key, label, placeholder, required = false, type = 'text') => (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        {label}{required && ' *'}
      </label>
      <input
        type={type}
        required={required}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md mx-4 shadow-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Ajouter un utilisateur</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            <MdClose className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {field('firstName', 'Prénom', 'Mohamed', true)}
            {field('lastName',  'Nom',    'Dupont',  true)}
          </div>
          {field('email', 'Email', 'utilisateur@ventec.dz', true, 'email')}
          <div className="grid grid-cols-2 gap-3">
            {field('password',        'Mot de passe',    '6 caractères min.', true, 'password')}
            {field('confirmPassword', 'Confirmer',       '••••••',            true, 'password')}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Rôle *</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {field('department', 'Département', 'ex : RH, Finance, IT…')}

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
              <MdCheck className="w-4 h-4" />{saving ? 'Ajout…' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ── Users tab ─────────────────────────────────────────── */
const UsersTab = ({ api }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = () => {
    api.getUsers()
      .then((r) => setUsers(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (form) => {
    await api.createUser(form);
    load();
  };

  const handleEditSave = async (form) => {
    await api.updateUser(editUser.id, form);
    load();
  };

  const handleDelete = async () => {
    await api.deleteUser(deleteUser.id);
    load();
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {users.length} utilisateur{users.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-semibold shadow-sm transition-colors"
        >
          <MdPersonAdd className="w-4 h-4" /> Ajouter un utilisateur
        </button>
      </div>

      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <MdPerson className="w-10 h-10" />
          <p className="text-sm">Aucun utilisateur enregistré.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Utilisateur</th>
                <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Email</th>
                <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Rôle</th>
                <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Département</th>
                <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                    {u.firstName || u.lastName ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                      {u.role ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{u.department || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                      {u.active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditUser(u)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg transition-colors"
                        title="Modifier"
                      >
                        <MdEdit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteUser(u)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <MdDelete className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {showAdd && (
        <AddUserModal onSave={handleAdd} onClose={() => setShowAdd(false)} />
      )}

      {editUser && (
        <EditUserModal
          user={editUser}
          onSave={handleEditSave}
          onClose={() => setEditUser(null)}
        />
      )}

      {deleteUser && (
        <DeleteConfirmModal
          user={deleteUser}
          onConfirm={handleDelete}
          onClose={() => setDeleteUser(null)}
        />
      )}
    </>
  );
};

/* ── Page ───────────────────────────────────────────────── */
export const AdminPage = () => {
  const axios = useAxiosPrivate();
  const api = adminApi(axios);
  const [refreshKey, setRefreshKey] = useState(0);

  usePageActions(
    <button onClick={() => setRefreshKey((k) => k + 1)} className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
      <MdRefresh className="w-4 h-4" /><span className="hidden sm:inline">Actualiser</span>
    </button>
  );

  return (
    <div className="p-6">
      <UsersTab key={refreshKey} api={api} />
    </div>
  );
};
