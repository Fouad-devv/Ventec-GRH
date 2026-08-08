import { useEffect, useState } from 'react';
import { MdPersonAdd, MdEdit, MdDelete, MdClose, MdCheck, MdPerson, MdWarning, MdRefresh, MdSearch } from 'react-icons/md';
import useAxiosPrivate from '../../api/useAxiosPrivate';
import { adminApi } from '../../api/admin';
import { usePageActions } from '../../context/HeaderContext';

const ROLES = ['RH', 'ADMIN'];

const ROLE_COLORS = {
  RH:    'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  ADMIN: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
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

  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const [selectionMode, setSelectionMode]               = useState(false);
  const [selectedIds, setSelectedIds]                   = useState(new Set());
  const [confirmDeleteSelected, setConfirmDeleteSelected] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll]         = useState(false);
  const [deletingBulk, setDeletingBulk]                 = useState(false);

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

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = async () => {
    const ids = [...selectedIds];
    const count = ids.length;
    setDeletingBulk(true);
    try {
      await Promise.all(ids.map((id) => api.deleteUser(id)));
      setConfirmDeleteSelected(false);
      exitSelectionMode();
      load();
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingBulk(false);
    }
  };

  const handleDeleteAll = async () => {
    const items = [...filtered];
    setDeletingBulk(true);
    try {
      await Promise.all(items.map((u) => api.deleteUser(u.id)));
      setConfirmDeleteAll(false);
      exitSelectionMode();
      load();
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingBulk(false);
    }
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      `${u.firstName ?? ''} ${u.lastName ?? ''}`.toLowerCase().includes(q) ||
      (u.email ?? '').toLowerCase().includes(q);
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const allSelected = filtered.length > 0 && filtered.every((u) => selectedIds.has(u.id));

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {filtered.length} utilisateur{filtered.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-semibold shadow-sm transition-colors"
        >
          <MdPersonAdd className="w-4 h-4" /> Ajouter un utilisateur
        </button>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Nom ou email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tous les rôles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <div className="flex gap-1.5">
          <button
            onClick={() => setConfirmDeleteAll(true)}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <MdDelete className="w-3.5 h-3.5" /> Tout supprimer
          </button>
          <button
            onClick={() => { setSelectionMode((v) => !v); setSelectedIds(new Set()); }}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
              selectionMode
                ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                : 'border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <MdCheck className="w-3.5 h-3.5" /> Sélectionner
          </button>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <MdPerson className="w-10 h-10" />
          <p className="text-sm">Aucun utilisateur enregistré.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {selectionMode && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {selectedIds.size} sélectionné{selectedIds.size !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => setSelectedIds(allSelected ? new Set() : new Set(filtered.map((u) => u.id)))}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
              <div className="flex-1" />
              <button onClick={exitSelectionMode} className="text-xs text-slate-500 dark:text-slate-400 hover:underline">
                Annuler
              </button>
              {selectedIds.size > 0 && (
                <button
                  onClick={() => setConfirmDeleteSelected(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors"
                >
                  <MdDelete className="w-3.5 h-3.5" /> Supprimer ({selectedIds.size})
                </button>
              )}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  {selectionMode && <th className="w-10 px-4 py-3" />}
                  <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Utilisateur</th>
                  <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Email</th>
                  <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Rôle</th>
                  <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Département</th>
                  <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Statut</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={selectionMode ? 6 : 6} className="text-center py-10 text-slate-400">Aucun utilisateur trouvé</td>
                  </tr>
                ) : filtered.map((u) => {
                  const isSelected = selectedIds.has(u.id);
                  return (
                    <tr
                      key={u.id}
                      className={`transition-colors ${selectionMode ? 'cursor-pointer' : ''} ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/30'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                      onClick={() => selectionMode && toggleSelect(u.id)}
                    >
                      {selectionMode && (
                        <td className="px-4 py-3">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {isSelected && <MdCheck className="w-3 h-3 text-white" />}
                          </div>
                        </td>
                      )}
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
                      <td className="px-4 py-3" onClick={(e) => selectionMode && e.stopPropagation()}>
                        {!selectionMode && (
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
                        )}
                      </td>
                    </tr>
                  );
                })}
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

      {confirmDeleteSelected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-950 rounded-xl">
                <MdWarning className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Supprimer la sélection</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              Supprimer <span className="font-semibold text-slate-900 dark:text-white">{selectedIds.size} utilisateur{selectedIds.size !== 1 ? 's' : ''}</span> sélectionné{selectedIds.size !== 1 ? 's' : ''} ?
            </p>
            <p className="text-xs text-red-500 mb-5">Cette action est irréversible et supprime aussi les comptes Keycloak associés.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDeleteSelected(false)} disabled={deletingBulk}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
                Annuler
              </button>
              <button onClick={handleDeleteSelected} disabled={deletingBulk}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors">
                {deletingBulk ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <MdDelete className="w-4 h-4" />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-950 rounded-xl">
                <MdWarning className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Supprimer tous les utilisateurs</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              Supprimer <span className="font-semibold text-slate-900 dark:text-white">{filtered.length} utilisateur{filtered.length !== 1 ? 's' : ''}</span> affiché{filtered.length !== 1 ? 's' : ''} ?
            </p>
            <p className="text-xs text-red-500 mb-5">Cette action est irréversible et supprime aussi les comptes Keycloak associés.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDeleteAll(false)} disabled={deletingBulk}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
                Annuler
              </button>
              <button onClick={handleDeleteAll} disabled={deletingBulk}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors">
                {deletingBulk ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <MdDelete className="w-4 h-4" />}
                Supprimer tout
              </button>
            </div>
          </div>
        </div>
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
