import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MdWork, MdPeople, MdAccountTree, MdCheckCircle,
  MdWarning, MdInfo, MdTrendingUp, MdEvent, MdCalendarMonth, MdRefresh, MdEmail,
} from 'react-icons/md';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import useAxiosPrivate from '../../api/useAxiosPrivate';
import { dashboardApi } from '../../api/dashboard';
import { emailCandidaturesApi } from '../../api/emailCandidatures';
import { usePageActions } from '../../context/HeaderContext';

/* ── Stat card ─────────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, gradient, numGradient, sub }) => (
  <div className="group relative overflow-hidden bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-transparent transition-all duration-300 cursor-default">
    {/* Top accent bar — grows on hover */}
    <div className={`absolute inset-x-0 top-0 h-[3px] group-hover:h-[5px] bg-gradient-to-r ${gradient} transition-all duration-300`} />
    {/* Subtle color wash on hover */}
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-[0.05] dark:group-hover:opacity-[0.1] transition-opacity duration-300`} />
    <div className="relative flex items-start justify-between gap-3 pt-1">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-tight">{label}</p>
        <p className={`text-3xl font-extrabold mt-1.5 leading-none tabular-nums bg-gradient-to-br ${numGradient} bg-clip-text text-transparent`}>
          {value ?? '—'}
        </p>
        {sub && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 truncate">{sub}</p>}
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br ${gradient} shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all duration-300`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  </div>
);

/* ── Alert banner ──────────────────────────────────────── */
const Alert = ({ type, message, count, onNavigate }) => {
  const styles = {
    info:    'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
    warning: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
    success: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
    overdue: 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300',
  };
  const Icon = { info: MdInfo, warning: MdWarning, success: MdCheckCircle, overdue: MdWarning }[type];

  if (type === 'overdue') {
    return (
      <button
        onClick={onNavigate}
        className={`w-full flex items-center justify-between gap-2 px-3 h-5 rounded-lg border ${styles.overdue} hover:bg-red-100 dark:hover:bg-red-950/60 transition-colors text-left`}
      >
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 shrink-0" />
          <p className="text-xs font-semibold leading-none">
            {count} entretien{count > 1 ? 's' : ''} passé{count > 1 ? 's' : ''} sans statut — action requise
          </p>
        </div>
        <span className="text-xs font-semibold underline shrink-0">Voir →</span>
      </button>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 h-5 rounded-lg border ${styles[type]}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <p className="text-xs font-medium leading-none">{message}</p>
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

/* ── Section heading ───────────────────────────────────── */
const SectionTitle = ({ children }) => (
  <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
    {children}
  </h2>
);

/* ── Spinner ───────────────────────────────────────────── */
const Spinner = () => (
  <div className="flex flex-col items-center justify-center py-40 gap-4">
    <div className="w-14 h-14 rounded-full border-4 border-blue-100 dark:border-blue-900 border-t-blue-600 animate-spin" />
    <p className="text-sm text-slate-400">Chargement du tableau de bord…</p>
  </div>
);

/* ── Page ──────────────────────────────────────────────── */
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

export const DashboardPage = () => {
  const axios = useAxiosPrivate();
  const api = dashboardApi(axios);
  const emailApi = emailCandidaturesApi(axios);
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [yearData, setYearData] = useState(null);
  const [yearLoading, setYearLoading] = useState(false);
  const [emailAlertCount, setEmailAlertCount] = useState(0);

  const load = () => {
    setLoading(true);
    api.getStats()
      .then((r) => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const todayStr = new Date().toDateString();
    emailApi.getAll()
      .then((r) => {
        const count = r.data.filter((item) =>
          (item.status === 'NO_MATCH' || item.status === 'NO_SUBJECT') &&
          item.receivedAt && new Date(item.receivedAt).toDateString() === todayStr
        ).length;
        setEmailAlertCount(count);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setYearLoading(true);
    api.getYearBreakdown(selectedYear)
      .then((r) => setYearData(r.data))
      .catch(console.error)
      .finally(() => setYearLoading(false));
  }, [selectedYear]);

  usePageActions(
    <button
      onClick={load}
      className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
    >
      <MdRefresh className="w-4 h-4" /><span className="hidden sm:inline">Actualiser</span>
    </button>
  );

  if (loading) return <Spinner />;

  const funnelData = [
    { name: 'Candidatures', value: stats?.totalApplications       ?? 0, fill: '#6366f1' },
    { name: 'En attente',   value: stats?.pendingApplications     ?? 0, fill: '#f59e0b' },
    { name: 'Sélectionnés', value: stats?.shortlistedApplications ?? 0, fill: '#8b5cf6' },
    { name: 'Entretiens',   value: stats?.interviewApplications   ?? 0, fill: '#3b82f6' },
    { name: 'Embauchés',    value: stats?.hiredApplications       ?? 0, fill: '#10b981' },
  ];

  const statusData = [
    { name: 'En attente',  value: yearData?.pending     ?? 0, color: '#f59e0b' },
    { name: 'Sélectionné', value: yearData?.shortlisted ?? 0, color: '#6366f1' },
    { name: 'Entretiens',  value: yearData?.interviews  ?? 0, color: '#3b82f6' },
    { name: 'Embauché',    value: yearData?.hired       ?? 0, color: '#10b981' },
    { name: 'Rejeté',      value: yearData?.rejected    ?? 0, color: '#ef4444' },
  ].filter((d) => d.value > 0);

  const overdueCount = stats?.overdueInterviews?.length ?? 0;

  const alerts = [];
  if (overdueCount > 0)
    alerts.push({ type: 'overdue', count: overdueCount });
  if ((stats?.pendingApplications ?? 0) > 5)
    alerts.push({ type: 'warning', message: `${stats.pendingApplications} candidatures en attente de traitement` });
  if ((stats?.interviewsThisWeek ?? 0) > 0)
    alerts.push({ type: 'info', message: `${stats.interviewsThisWeek} entretien${stats.interviewsThisWeek > 1 ? 's' : ''} planifié${stats.interviewsThisWeek > 1 ? 's' : ''} cette semaine` });
  if ((stats?.hiredThisMonth ?? 0) > 0)
    alerts.push({ type: 'success', message: `${stats.hiredThisMonth} embauche${stats.hiredThisMonth > 1 ? 's' : ''} confirmée${stats.hiredThisMonth > 1 ? 's' : ''} ce mois` });
  if ((stats?.activeJobPostings ?? 0) === 0)
    alerts.push({ type: 'warning', message: "Aucune offre d'emploi active en ce moment" });
  if (emailAlertCount > 0)
    alerts.push({ type: 'warning', message: `${emailAlertCount} email${emailAlertCount > 1 ? 's' : ''} de candidature non traité${emailAlertCount > 1 ? 's' : ''} aujourd'hui (sans offre ou sans objet)` });

  return (
    <div className="p-6 space-y-8">

      {/* ── KPI cards ── */}
      <section>
        <SectionTitle>Vue d'ensemble</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={MdPeople}
            label="Total candidats"
            value={stats?.totalCandidates}
            gradient="from-violet-500 to-violet-700"
            numGradient="from-violet-900 to-violet-600"
          />
          <StatCard
            icon={MdWork}
            label="Offres actives"
            value={stats?.activeJobPostings}
            sub={`sur ${stats?.totalJobPostings ?? 0} au total`}
            gradient="from-blue-500 to-blue-700"
            numGradient="from-blue-900 to-blue-600"
          />
          <StatCard
            icon={MdAccountTree}
            label="Candidatures"
            value={stats?.totalApplications}
            gradient="from-orange-500 to-orange-700"
            numGradient="from-orange-900 to-orange-600"
          />
          <StatCard
            icon={MdEvent}
            label="Entretiens cette semaine"
            value={stats?.interviewsThisWeek}
            gradient="from-emerald-500 to-emerald-700"
            numGradient="from-emerald-900 to-emerald-600"
          />
        </div>

        {/* Email alert KPI */}
        <div className="mt-4">
          <StatCard
            icon={MdEmail}
            label="Emails non traités aujourd'hui"
            value={emailAlertCount}
            sub={emailAlertCount > 0 ? 'Sans offre correspondante ou sans objet' : 'Aucun problème détecté'}
            gradient={emailAlertCount > 0 ? 'from-red-500 to-rose-700' : 'from-emerald-500 to-emerald-700'}
            numGradient={emailAlertCount > 0 ? 'from-red-900 to-rose-600' : 'from-emerald-900 to-emerald-600'}
          />
        </div>
      </section>

      {/* ── Charts ── */}
      <section>
        <SectionTitle>Analyse du pipeline</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Bar chart */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Entonnoir de recrutement</h3>
                <p className="text-xs text-slate-400 mt-0.5">Vue d'ensemble du pipeline actuel</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <MdTrendingUp className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={funnelData} barSize={40} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Bar dataKey="value" name="Nombre" radius={[6, 6, 0, 0]}>
                  {funnelData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Donut chart */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className="mb-5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Activité de recrutement</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Répartition annuelle</p>
                </div>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="text-xs font-semibold px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            {yearLoading ? (
              <div className="flex items-center justify-center h-[230px]">
                <div className="w-8 h-8 rounded-full border-4 border-blue-100 dark:border-blue-900 border-t-blue-500 animate-spin" />
              </div>
            ) : statusData.length === 0 ? (
              <div className="flex items-center justify-center h-[230px] text-slate-400 text-sm">Aucune donnée pour {selectedYear}</div>
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="45%" innerRadius={60} outerRadius={88} paddingAngle={3} dataKey="value">
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" iconSize={8} formatter={(value) => (
                    <span className="text-xs text-slate-600 dark:text-slate-400">{value}</span>
                  )} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* ── Hired highlight banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-6 shadow-md">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white opacity-[0.04]" />
        <div className="absolute bottom-0 left-1/2 w-64 h-32 rounded-full bg-indigo-500 opacity-10 blur-2xl" />
        <div className="relative flex items-center justify-between gap-6">
          <div>
            <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-1">Ce mois-ci</p>
            <div className="flex items-end gap-3">
              <p className="text-white text-5xl font-extrabold leading-none">{stats?.hiredThisMonth ?? 0}</p>
              <p className="text-blue-200 text-base font-medium mb-1">
                embauche{(stats?.hiredThisMonth ?? 0) !== 1 ? 's' : ''} confirmée{(stats?.hiredThisMonth ?? 0) !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex gap-6 shrink-0">
            <div className="text-center">
              <p className="text-3xl font-extrabold text-white">{stats?.totalCandidates ?? 0}</p>
              <p className="text-blue-200 text-xs mt-0.5">Candidats</p>
            </div>
            <div className="w-px bg-white/20 self-stretch" />
            <div className="text-center">
              <p className="text-3xl font-extrabold text-white">{stats?.totalApplications ?? 0}</p>
              <p className="text-blue-200 text-xs mt-0.5">Candidatures</p>
            </div>
            <div className="hidden sm:block w-px bg-white/20 self-stretch" />
            <div className="hidden sm:block text-center">
              <p className="text-3xl font-extrabold text-white">{stats?.activeJobPostings ?? 0}</p>
              <p className="text-blue-200 text-xs mt-0.5">Offres actives</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom row: upcoming interviews + alerts ── */}
      <section>
        <SectionTitle>Activité récente</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Upcoming interviews */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center shrink-0">
                <MdCalendarMonth className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Entretiens à venir</h3>
                <p className="text-xs text-slate-400">Dans les 7 prochains jours</p>
              </div>
            </div>
            <div className="p-4">
              {(!stats?.upcomingInterviews || stats.upcomingInterviews.length === 0) ? (
                <p className="text-sm text-slate-400 py-6 text-center">Aucun entretien planifié cette semaine</p>
              ) : (
                <div className="space-y-2">
                  {stats.upcomingInterviews.map((iv) => {
                    const date = iv.scheduledAt ? new Date(iv.scheduledAt) : null;
                    const TYPE_ICONS = { VIDEO: '🎥', PHONE: '📞', ON_SITE: '🏢' };
                    return (
                      <button
                        key={iv.interviewId}
                        onClick={() => iv.candidateId && navigate(`/app/candidates/${iv.candidateId}`)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors text-left"
                      >
                        <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-base shrink-0 shadow-sm">
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
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center shrink-0">
                  <MdWarning className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Alertes & notifications</h3>
                  <p className="text-xs text-slate-400">{alerts.length} notification{alerts.length > 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="p-4 space-y-2">
                {alerts.map((a, i) => <Alert key={i} {...a} onNavigate={() => navigate('/app/interviews')} />)}
              </div>
            </div>
          )}
        </div>
      </section>

    </div>
  );
};
