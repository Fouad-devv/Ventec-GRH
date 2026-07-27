import { useEffect, useState } from 'react';
import { MdPowerSettingsNew, MdPersonAdd } from 'react-icons/md';
import { PageHeader } from '../../components/PageHeader';
import useAxiosPrivate from '../../api/useAxiosPrivate';
import { adminApi } from '../../api/admin';
import { usePageActions } from '../../context/HeaderContext';

export const AdminPage = () => {
  const axios = useAxiosPrivate();
  const api = adminApi(axios);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSync, setShowSync] = useState(false);
  const [syncForm, setSyncForm] = useState({ keycloakId: '', email: '', firstName: '', lastName: '', role: 'RH', department: '' });
  const [syncing, setSyncing] = useState(false);

  usePageActions(
    <button
      onClick={() => setShowSync(true)}
      className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs sm:text-sm font-medium"
    >
      <MdPersonAdd className="w-4 h-4 shrink-0" />
      <span className="hidden sm:inline">Synchroniser utilisateur</span>
    </button>
  );

  const load = () => {
    api.getUsers()
      .then((r) => setUsers(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const deactivate = async (id) => {
    await api.deactivate(id);
    load();
  };

  const handleSync = async (e) => {
    e.preventDefault();
    setSyncing(true);
    try {
      await api.syncUser(syncForm);
      setShowSync(false);
      load();
    } catch (err) { console.error(err); }
    finally { setSyncing(false); }
  };

  return (
    <div className="p-6">
      <PageHeader subtitle="Gestion des utilisateurs" />

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
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
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-medium">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{u.department || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.active
                        ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {u.active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.active && (
                      <button
                        onClick={() => deactivate(u.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded"
                      >
                        <MdPowerSettingsNew className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showSync && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md mx-4 shadow-xl p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Synchroniser un utilisateur</h2>
            <form onSubmit={handleSync} className="space-y-3">
              {[['keycloakId', 'ID Keycloak *', true], ['email', 'Email *', true], ['firstName', 'Prénom'], ['lastName', 'Nom'], ['department', 'Département']].map(([field, label, req]) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
                  <input
                    required={req}
                    value={syncForm[field]}
                    onChange={(e) => setSyncForm((f) => ({ ...f, [field]: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Rôle *</label>
                <select
                  value={syncForm.role}
                  onChange={(e) => setSyncForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="RH">RH</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSync(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={syncing}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
                >
                  {syncing ? 'Sync...' : 'Synchroniser'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
