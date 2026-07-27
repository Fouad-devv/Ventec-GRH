import { useEffect, useState } from 'react';
import { MdWork, MdPeople, MdAccountTree, MdEvent, MdCheckCircle, MdPending } from 'react-icons/md';
import { PageHeader } from '../../components/PageHeader';
import useAxiosPrivate from '../../api/useAxiosPrivate';
import { dashboardApi } from '../../api/dashboard';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value ?? '—'}</p>
    </div>
  </div>
);

export const DashboardPage = () => {
  const axios = useAxiosPrivate();
  const api = dashboardApi(axios);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStats()
      .then((r) => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <PageHeader title="Tableau de bord" subtitle="Vue d'ensemble du recrutement" />

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard icon={MdWork} label="Offres d'emploi" value={stats?.totalJobPostings} color="bg-blue-500" />
          <StatCard icon={MdWork} label="Offres actives" value={stats?.activeJobPostings} color="bg-green-500" />
          <StatCard icon={MdPeople} label="Candidats" value={stats?.totalCandidates} color="bg-purple-500" />
          <StatCard icon={MdAccountTree} label="Candidatures" value={stats?.totalApplications} color="bg-orange-500" />
          <StatCard icon={MdPending} label="En attente" value={stats?.pendingApplications} color="bg-yellow-500" />
          <StatCard icon={MdEvent} label="Entretiens cette semaine" value={stats?.interviewsThisWeek} color="bg-indigo-500" />
          <StatCard icon={MdCheckCircle} label="Embauchés ce mois" value={stats?.hiredThisMonth} color="bg-teal-500" />
        </div>
      )}
    </div>
  );
};
