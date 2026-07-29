import { useEffect, useState } from 'react';
import { MdPowerSettingsNew, MdPersonAdd, MdAdd, MdEdit, MdDelete, MdClose, MdCheck } from 'react-icons/md';
import useAxiosPrivate from '../../api/useAxiosPrivate';
import { adminApi } from '../../api/admin';

/* ── Users tab ─────────────────────────────────────────── */
const UsersTab = ({ api }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSync, setShowSync] = useState(false);
  const [syncForm, setSyncForm] = useState({ keycloakId: '', email: '', firstName: '', lastName: '', role: 'RH', department: '' });
  const [syncing, setSyncing] = useState(false);

  const load = () => {
    api.getUsers()
      .then((r) => setUsers(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const deactivate = async (id) => { await api.deactivate(id); load(); };

  const handleSync = async (e) => {
    e.preventDefault();
    setSyncing(true);
    try { await api.syncUser(syncForm); setShowSync(false); load(); }
    catch (err) { console.error(err); }
    finally { setSyncing(false); }
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowSync(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-semibold shadow-sm transition-colors"
        >
          <MdPersonAdd className="w-5 h-5" /> Synchroniser utilisateur
        </button>
      </div>

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
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{u.firstName} {u.lastName}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-medium">{u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{u.department || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.active ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                      {u.active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.active && (
                      <button onClick={() => deactivate(u.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded">
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
                  <input required={req} value={syncForm[field]} onChange={(e) => setSyncForm((f) => ({ ...f, [field]: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Rôle *</label>
                <select value={syncForm.role} onChange={(e) => setSyncForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                  <option value="RH">RH</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowSync(false)} className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">Annuler</button>
                <button type="submit" disabled={syncing} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
                  {syncing ? 'Sync...' : 'Synchroniser'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

/* ── Template form modal ────────────────────────────────── */
const TYPES = ['EMAIL', 'DOCUMENT', 'CONTRAT', 'AUTRE'];

const TemplateModal = ({ initial, onSave, onClose }) => {
  const [form, setForm] = useState(initial ?? { name: '', type: 'EMAIL', subject: '', content: '' });
  const [saving, setSaving] = useState(false);

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg mx-4 shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            {initial ? 'Modifier le template' : 'Nouveau template'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            <MdClose className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Nom *</label>
              <input required value={form.name} onChange={set('name')} placeholder="Nom du template"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Type</label>
              <select value={form.type} onChange={set('type')}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          {form.type === 'EMAIL' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Sujet de l'email</label>
              <input value={form.subject} onChange={set('subject')} placeholder="Objet du message"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Contenu</label>
            <textarea value={form.content} onChange={set('content')} rows={8} placeholder="Corps du template…"
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-y" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">Annuler</button>
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

/* ── Templates tab ──────────────────────────────────────── */
const TYPE_COLORS = {
  EMAIL:    'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  DOCUMENT: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  CONTRAT:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  AUTRE:    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

const TemplatesTab = ({ api }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | { mode: 'create' } | { mode: 'edit', data }

  const load = () => {
    api.getTemplates()
      .then((r) => setTemplates(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    if (modal.mode === 'create') await api.createTemplate(form);
    else await api.updateTemplate(modal.data.id, form);
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce template ?')) return;
    await api.deleteTemplate(id);
    load();
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setModal({ mode: 'create' })}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-semibold shadow-sm transition-colors"
        >
          <MdAdd className="w-5 h-5" /> Nouveau template
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">Aucun template. Créez-en un pour commencer.</div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-slate-900 dark:text-white truncate">{t.name}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${TYPE_COLORS[t.type] ?? TYPE_COLORS.AUTRE}`}>{t.type}</span>
                </div>
                {t.subject && <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Sujet : {t.subject}</p>}
                <p className="text-xs text-slate-400 line-clamp-2 whitespace-pre-line">{t.content || '—'}</p>
                <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-1">
                  Modifié le {new Date(t.updatedAt).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => setModal({ mode: 'edit', data: t })}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                >
                  <MdEdit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                >
                  <MdDelete className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <TemplateModal
          initial={modal.mode === 'edit' ? modal.data : null}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
};

/* ── Page ───────────────────────────────────────────────── */
const TABS = [
  { key: 'users', label: 'Utilisateurs' },
  { key: 'templates', label: 'Templates' },
];

export const AdminPage = () => {
  const axios = useAxiosPrivate();
  const api = adminApi(axios);
  const [tab, setTab] = useState('users');

  return (
    <div className="p-6">
      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200 dark:border-slate-800">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersTab api={api} />}
      {tab === 'templates' && <TemplatesTab api={api} />}
    </div>
  );
};
