import { useEffect, useState } from 'react';
import {
  MdWork, MdPeople, MdAccountTree, MdCheckCircle,
  MdWarning, MdInfo, MdTrendingUp, MdEvent, MdCalendarMonth, MdRefresh,
} from 'react-icons/md';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import useAxiosPrivate from '../../api/useAxiosPrivate';
import { dashboardApi } from '../../api/dashboard';
import { usePageActions } from '../../context/HeaderContext';

/* ── Stat card ─────────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, gradient, sub }) => (
  <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex items-center gap-4 shadow-sm">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${gradient} shadow-sm`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div className="min-w-0">
      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{label}</p>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value ?? '—'}</p>
      {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  </div>
);

/* ── Alert banner ──────────────────────────────────────── */
const Alert = ({ type, message }) => {
  const styles = {
    info:    'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
    warning: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
    success: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
  };
  const Icon = { info: MdInfo, warning: MdWarning, success: MdCheckCircle }[type];
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${styles[type]}`}>
      <Icon className="w-5 h-5 shrink-0" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
};

/* ── Custom chart tooltip ──────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 shadow-lg text-sm">
      {label && <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color ?? p.fill }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

/* ── Spinner ───────────────────────────────────────────── */
const Spinner = () => (
  <div className="flex flex-col items-center justify-center py-40 gap-4">
    <div className="w-14 h-14 rounded-full border-4 border-blue-100 dark:border-blue-900 border-t-blue-600 animate-spin" />
    <p className="text-sm text-slate-400">Chargement du tableau de bord…</p>
  </div>
);

/* ── Page ──────────────────────────────────────────────── */
export const DashboardPage = () => {
  const axios = useAxiosPrivate();
  const api = dashboardApi(axios);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.getStats()
      .then((r) => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  usePageActions(
    <button onClick={load} className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
      <MdRefresh className="w-4 h-4" /><span className="hidden sm:inline">Actualiser</span>
    </button>
  );

  if (loading) return <Spinner />;

  /* Chart data */
  const funnelData = [
    { name: 'Candidatures', value: stats?.totalApplications   ?? 0, fill: '#6366f1' },
    { name: 'En attente',   value: stats?.pendingApplications ?? 0, fill: '#f59e0b' },
    { name: 'Entretiens',   value: stats?.interviewsThisWeek  ?? 0, fill: '#3b82f6' },
    { name: 'Embauchés',    value: stats?.hiredThisMonth      ?? 0, fill: '#10b981' },
  ];

  const statusData = [
    { name: 'En attente',   value: stats?.pendingApplications    ?? 0, color: '#f59e0b' },
    { name: 'Sélectionné',  value: stats?.shortlistedApplications ?? 0, color: '#6366f1' },
    { name: 'Entretien',    value: stats?.interviewApplications   ?? 0, color: '#3b82f6' },
    { name: 'Embauché',     value: stats?.hiredApplications       ?? 0, color: '#10b981' },
    { name: 'Rejeté',       value: stats?.rejectedApplications    ?? 0, color: '#ef4444' },
  ].filter((d) => d.value > 0);

  /* Smart alerts */
  const alerts = [];
  if ((stats?.pendingApplications ?? 0) > 5)
    alerts.push({ type: 'warning', message: `${stats.pendingApplications} candidatures en attente de traitement` });
  if ((stats?.interviewsThisWeek ?? 0) > 0)
    alerts.push({ type: 'info', message: `${stats.interviewsThisWeek} entretien${stats.interviewsThisWeek > 1 ? 's' : ''} planifié${stats.interviewsThisWeek > 1 ? 's' : ''} cette semaine` });
  if ((stats?.hiredThisMonth ?? 0) > 0)
    alerts.push({ type: 'success', message: `${stats.hiredThisMonth} embauche${stats.hiredThisMonth > 1 ? 's' : ''} confirmée${stats.hiredThisMonth > 1 ? 's' : ''} ce mois` });
  if ((stats?.activeJobPostings ?? 0) === 0)
    alerts.push({ type: 'warning', message: "Aucune offre d'emploi active en ce moment" });

  return (
    <div className="p-6 space-y-6">

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={MdPeople}
          label="Candidats" value={stats?.totalCandidates}
          gradient="from-violet-500 to-violet-700"
        />
        <StatCard
          icon={MdWork}
          label="Offres actives" value={stats?.activeJobPostings}
          sub={`/ ${stats?.totalJobPostings ?? 0} au total`}
          gradient="from-blue-500 to-blue-700"
        />
        <StatCard
          icon={MdAccountTree}
          label="Candidatures" value={stats?.totalApplications}
          gradient="from-orange-500 to-orange-700"
        />
        <StatCard
          icon={MdEvent}
          label="Entretiens / semaine" value={stats?.interviewsThisWeek}
          gradient="from-emerald-500 to-emerald-700"
        />
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Bar chart — recruitment funnel */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Entonnoir de recrutement</h3>
              <p className="text-xs text-slate-400 mt-0.5">Vue d'ensemble du pipeline actuel</p>
            </div>
            <MdTrendingUp className="w-5 h-5 text-slate-400" />
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={funnelData} barSize={40} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={false} tickLine={false} width={28}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
              <Bar dataKey="value" name="Nombre" radius={[8, 8, 0, 0]}>
                {funnelData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donut chart — application status */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <div className="mb-5">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Statut des candidatures</h3>
            <p className="text-xs text-slate-400 mt-0.5">Répartition actuelle</p>
          </div>
          {statusData.length === 0 ? (
            <div className="flex items-center justify-center h-[230px] text-slate-400 text-sm">
              Aucune candidature
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%" cy="45%"
                  innerRadius={60} outerRadius={88}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  iconType="circle" iconSize={8}
                  formatter={(value) => (
                    <span className="text-xs text-slate-600 dark:text-slate-400">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Hired highlight banner ── */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 flex items-center justify-between shadow-sm">
        <div>
          <p className="text-blue-100 text-sm font-medium">Embauchés ce mois</p>
          <p className="text-white text-4xl font-extrabold mt-1">{stats?.hiredThisMonth ?? 0}</p>
          <p className="text-blue-200 text-xs mt-1">Nouvelles embauches confirmées</p>
        </div>
        <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center">
          <MdCheckCircle className="w-9 h-9 text-white" />
        </div>
      </div>

      {/* ── Bottom row: upcoming interviews + alerts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Upcoming interviews */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <MdCalendarMonth className="w-5 h-5 text-blue-500" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Entretiens à venir <span className="text-sm font-normal text-slate-400">(7 jours)</span>
            </h3>
          </div>
          {(!stats?.upcomingInterviews || stats.upcomingInterviews.length === 0) ? (
            <p className="text-sm text-slate-400 py-4 text-center">Aucun entretien planifié cette semaine</p>
          ) : (
            <div className="space-y-3">
              {stats.upcomingInterviews.map((iv) => {
                const date = iv.scheduledAt ? new Date(iv.scheduledAt) : null;
                const TYPE_ICONS = { VIDEO: '🎥', PHONE: '📞', ON_SITE: '🏢' };
                return (
                  <div key={iv.interviewId} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-lg shrink-0">
                      {TYPE_ICONS[iv.type] ?? '📅'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {iv.candidateFirstName} {iv.candidateLastName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{iv.jobPostingTitle}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {date ? date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {date ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
              Alertes &amp; notifications
            </h3>
            <div className="space-y-3">
              {alerts.map((a, i) => <Alert key={i} {...a} />)}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
