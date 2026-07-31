import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  MdArrowBack, MdDownload, MdEmail, MdPhone, MdLocationOn,
  MdWork, MdSchool, MdStar, MdOpenInNew, MdDescription,
} from 'react-icons/md';
import useAxiosPrivate from '../../api/useAxiosPrivate';
import { candidatesApi } from '../../api/candidates';
import { applicationsApi } from '../../api/applications';
import { usePageBack } from '../../context/HeaderContext';

const STATUS_STYLES = {
  PENDING:     'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  REVIEWING:   'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  SHORTLISTED: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  INTERVIEW:   'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
  HIRED:       'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  REJECTED:    'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
};

const STATUS_LABELS = {
  PENDING: 'En attente', REVIEWING: 'En cours', SHORTLISTED: 'Sélectionné',
  INTERVIEW: 'Entretien', HIRED: 'Embauché', REJECTED: 'Refusé',
};

const ScoreBadge = ({ score }) => {
  if (score == null) return <span className="text-slate-400 text-xs">—</span>;
  const n = Number(score);
  const color = n >= 70 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950'
    : n >= 40 ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950'
    : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      <MdStar className="w-3 h-3" />{n.toFixed(0)}
    </span>
  );
};

const InfoRow = ({ icon: Icon, label, value }) => {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-slate-400 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{value}</p>
      </div>
    </div>
  );
};

export const CandidateDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const backTo = location.state?.from || '/app/candidates';
  const backLabel = location.state?.fromLabel ? `Retour à "${location.state.fromLabel}"` : 'Retour aux candidats';
  const axios = useAxiosPrivate();

  usePageBack(
    <button
      onClick={() => navigate(backTo)}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
    >
      <MdArrowBack className="w-4 h-4" />
      {backLabel}
    </button>
  );
  const api = candidatesApi(axios);
  const appApi = applicationsApi(axios);

  const [candidate, setCandidate] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(id),
      appApi.getByCandidate(id),
    ])
      .then(([cRes, aRes]) => {
        setCandidate(cRes.data);
        setApplications(aRes.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-40">
        <div className="w-12 h-12 rounded-full border-4 border-blue-100 dark:border-blue-900 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <p className="text-slate-400">Candidat introuvable</p>
      </div>
    );
  }

  const initials = `${candidate.firstName?.[0] ?? ''}${candidate.lastName?.[0] ?? ''}`.toUpperCase();
  let skills = [];
  if (candidate.skills) {
    try {
      const parsed = JSON.parse(candidate.skills);
      skills = Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : candidate.skills.split(',').map((s) => s.trim()).filter(Boolean);
    } catch {
      skills = candidate.skills.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  const bestScore = applications.length > 0
    ? Math.max(...applications.map((a) => Number(a.aiScore ?? 0)))
    : null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column: profile card ── */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            {/* Avatar + name */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white mb-3 shadow-md">
                {initials}
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {candidate.firstName} {candidate.lastName}
              </h2>
              {candidate.currentPosition && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{candidate.currentPosition}</p>
              )}
              {bestScore != null && applications.length > 0 && (
                <div className="mt-2">
                  <ScoreBadge score={bestScore} />
                  <p className="text-xs text-slate-400 mt-0.5">meilleur score IA</p>
                </div>
              )}
            </div>

            {/* Contact info */}
            <div className="space-y-3">
              <InfoRow icon={MdEmail} label="Email" value={candidate.email} />
              <InfoRow icon={MdPhone} label="Téléphone" value={candidate.phone} />
              <InfoRow icon={MdLocationOn} label="Localisation" value={candidate.location} />
              <InfoRow icon={MdWork} label="Expérience" value={candidate.experienceYears != null ? `${candidate.experienceYears} an(s)` : null} />
              <InfoRow icon={MdSchool} label="Formation" value={candidate.education} />
            </div>

            {/* LinkedIn */}
            {candidate.linkedinUrl && (
              <a
                href={candidate.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-2 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
              >
                <MdOpenInNew className="w-4 h-4" /> LinkedIn
              </a>
            )}

            {/* CV download */}
            {candidate.cvPath && (
              <button
                onClick={async () => {
                  try {
                    const res = await api.downloadCv(candidate.id);
                    const url = URL.createObjectURL(res.data);
                    Object.assign(document.createElement('a'), { href: url, download: `CV-${candidate.firstName}-${candidate.lastName}.pdf` }).click();
                    URL.revokeObjectURL(url);
                  } catch (e) { console.error(e); }
                }}
                className="mt-2 flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <MdDownload className="w-4 h-4" /> Télécharger le CV
              </button>
            )}
          </div>

        </div>

        {/* ── Right column: applications history + skills ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Historique des candidatures
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {applications.length} candidature{applications.length !== 1 ? 's' : ''}
              </p>
            </div>

            {applications.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
                Aucune candidature enregistrée
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {applications.map((app) => (
                  <div key={app.id} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white truncate">
                          {app.jobPostingTitle ?? 'Offre inconnue'}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString('fr-FR', {
                            day: 'numeric', month: 'long', year: 'numeric',
                          }) : ''}
                        </p>
                        {app.aiSummary && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                            {app.aiSummary}
                          </p>
                        )}
                        {app.notes && (
                          <p className="text-xs text-slate-400 italic mt-1 line-clamp-1">
                            Note : {app.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[app.status] ?? 'bg-slate-100 text-slate-600'}`}>
                          {STATUS_LABELS[app.status] ?? app.status}
                        </span>
                        <ScoreBadge score={app.aiScore} />
                        {app.status === 'HIRED' && app.jobPostingId && (
                          <button
                            onClick={async () => {
                              try {
                                const res = await api.downloadChecklist(id, app.jobPostingId);
                                const url = URL.createObjectURL(res.data);
                                Object.assign(document.createElement('a'), { href: url, download: `checklist-${candidate.lastName}.docx` }).click();
                                URL.revokeObjectURL(url);
                              } catch (e) { console.error(e); }
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors"
                          >
                            <MdDescription className="w-3.5 h-3.5" />
                            Liste documents
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Skills */}
          {skills.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Compétences</h3>
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <span key={s} className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
