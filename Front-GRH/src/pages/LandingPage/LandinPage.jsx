import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { HiArrowRight, HiCheckCircle, HiOfficeBuilding } from 'react-icons/hi';
import {
  MdWork, MdPeople, MdAccountTree, MdDescription, MdHistory,
  MdAutoAwesome, MdStar, MdCheckCircle, MdCalendarMonth, MdEvent,
} from 'react-icons/md';
import logo from '../../assets/Ventec-logo.jpeg';
import { ThemeToggle } from '../../components/ThemeToggle';

export const LandingPage = () => {
  const { isLoading, isAuthenticated, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate('/home', { replace: true });
  }, [isLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (isLoading || isAuthenticated) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in-view'); obs.unobserve(e.target); }
      }),
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('[data-reveal]').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return (
      <div className='bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white h-screen flex flex-col items-center justify-center'>
        <div className='h-12 w-12 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin' />
      </div>
    );
  }

  const features = [
    { icon: MdWork,        color: 'cyan',    title: "Offres d'emploi",     desc: "Créez et gérez vos offres en quelques clics. Suivez les candidatures en temps réel avec filtres et recherche avancée." },
    { icon: MdPeople,      color: 'violet',  title: 'Base candidats',      desc: 'Centralisez tous les profils, CVs et compétences dans un espace structuré. Retrouvez le bon profil instantanément.' },
    { icon: MdAutoAwesome, color: 'sky',     title: 'Scoring IA',          desc: "L'IA analyse chaque CV et attribue un score de correspondance automatique pour identifier les meilleurs profils." },
    { icon: MdAccountTree, color: 'emerald', title: 'Pipeline RH',         desc: "Pilotez chaque candidat de la réception à l'embauche avec un pipeline RH structuré en 5 étapes claires." },
    { icon: MdDescription, color: 'rose',    title: 'Export de documents', desc: "Générez automatiquement les checklists d'intégration en Word et PDF pour chaque candidat embauché." },
    { icon: MdHistory,     color: 'amber',   title: 'Historique RH',       desc: "Consultez l'historique complet des recrutements clôturés avec statistiques d'embauche et scores IA moyens." },
  ];

  const pipeline = [
    { step: '01', title: 'En attente',  desc: 'Candidature reçue',        color: 'cyan' },
    { step: '02', title: 'En examen',   desc: 'Analyse IA & scoring',     color: 'sky' },
    { step: '03', title: 'Entretien',   desc: 'Évaluation du candidat',   color: 'violet' },
    { step: '04', title: 'Embauché',    desc: 'Intégration & documents',  color: 'emerald' },
  ];

  const iconColorMap = {
    cyan:    'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
    violet:  'bg-violet-500/15 text-violet-600 dark:text-violet-400',
    sky:     'bg-sky-500/15 text-sky-600 dark:text-sky-400',
    emerald: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    rose:    'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    amber:   'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  };

  const stepColorMap = {
    cyan:    'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
    sky:     'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
    violet:  'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  };

  const scoreColor = (n) =>
    n >= 70 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
    : n >= 40 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
    : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300';

  const statusLabel = { PENDING: 'En attente', REVIEWING: 'En cours', SHORTLISTED: 'Sélectionné', INTERVIEW: 'Entretien' };
  const statusColor = {
    PENDING:     'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    REVIEWING:   'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    SHORTLISTED: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
    INTERVIEW:   'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300',
  };

  return (
    <div className='min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white'>

      {/* ── Keyframes + scroll-reveal ── */}
      <style>{`
        @keyframes fadeInUp   { from { opacity:0; transform:translateY(28px) } to { opacity:1; transform:none } }
        @keyframes fadeInDown { from { opacity:0; transform:translateY(-18px) } to { opacity:1; transform:none } }
        @keyframes float      { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-20px) } }
        @keyframes gradShift  { 0%,100% { background-position:0% 50% } 50% { background-position:100% 50% } }

        .h-badge  { animation: fadeInDown 0.7s cubic-bezier(.16,1,.3,1) 0.08s both }
        .h-title  { animation: fadeInUp   0.85s cubic-bezier(.16,1,.3,1) 0.25s both }
        .h-sub    { animation: fadeInUp   0.85s cubic-bezier(.16,1,.3,1) 0.42s both }
        .h-cta    { animation: fadeInUp   0.85s cubic-bezier(.16,1,.3,1) 0.56s both }
        .h-dash   { animation: fadeInUp   1.0s  cubic-bezier(.16,1,.3,1) 0.72s both }
        .a-header { animation: fadeInDown 0.55s cubic-bezier(.16,1,.3,1) 0s   both }

        .orb-1 { animation: float  9s ease-in-out 0s   infinite }
        .orb-2 { animation: float 11s ease-in-out 1.8s infinite }
        .orb-3 { animation: float 13s ease-in-out 3.5s infinite }

        .grad-anim {
          background-size: 200% 200%;
          animation: gradShift 5s ease infinite;
        }

        /* ── Scroll-reveal base ── */
        [data-reveal] {
          opacity: 0;
          transform: translateY(32px);
          transition:
            opacity  1.1s cubic-bezier(.16,1,.3,1) var(--rv-delay, 0ms),
            transform 1.1s cubic-bezier(.16,1,.3,1) var(--rv-delay, 0ms);
        }
        [data-reveal="left"]  { transform: translateX(-40px) }
        [data-reveal="right"] { transform: translateX(40px) }
        [data-reveal="scale"] { transform: scale(0.93) }
        [data-reveal].in-view { opacity: 1; transform: none }

        /* ── Score bar (animated width) ── */
        .score-bar { width: 0; transition: width 2s cubic-bezier(.16,1,.3,1) .8s }
        .ai-card.in-view .score-bar { width: 87% }

        .feat-card { transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease }
        .feat-card:hover { transform: translateY(-5px); box-shadow: 0 20px 40px -12px rgba(0,0,0,.12) }
        .feat-icon { transition: transform .3s cubic-bezier(.16,1,.3,1) }
        .feat-card:hover .feat-icon { transform: scale(1.15) rotate(-4deg) }

        .btn-glow { transition: transform .2s ease, box-shadow .3s ease }
        .btn-glow:hover { transform: scale(1.05); box-shadow: 0 0 32px rgba(34,211,238,.35), 0 8px 24px rgba(34,211,238,.2) }

        .pipe-step { transition: transform .25s ease }
        .pipe-step:hover { transform: translateY(-6px) }

        .nav-link { position:relative }
        .nav-link::after { content:''; position:absolute; bottom:-2px; left:0; width:0; height:1px; background:currentColor; transition:width .3s ease }
        .nav-link:hover::after { width:100% }
      `}</style>

      {/* ── Ambient orbs ── */}
      <div className='fixed inset-0 pointer-events-none' style={{ zIndex: 0 }}>
        <div className='orb-1 absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-500/[0.06] dark:bg-cyan-500/10 blur-[120px]' />
        <div className='orb-2 absolute top-[35%] right-[-15%] w-[500px] h-[500px] rounded-full bg-violet-500/[0.06] dark:bg-violet-500/10 blur-[120px]' />
        <div className='orb-3 absolute bottom-[5%] left-[15%] w-[400px] h-[400px] rounded-full bg-sky-500/[0.05] dark:bg-sky-500/8 blur-[100px]' />
        <div className='absolute inset-0 opacity-[0.35] dark:opacity-[1] dot-pattern' />
      </div>

      {/* ── Header ── */}
      <header className='a-header h-16 md:h-18 relative z-10 bg-white dark:bg-white/[0.06] mx-auto flex max-w-7xl items-center justify-between px-6 py-5 border-b border-slate-300 dark:border-white/[0.06]'>
        <div className='flex items-center gap-3'>
          <img src={logo} alt='Ventec logo'
            className='h-8 md:h-9 w-auto rounded-lg object-cover dark:border-white/20 transition-transform duration-300 hover:scale-105' />
          <div>
            <p className='hidden md:block text-[10px] uppercase tracking-[0.35em] text-cyan-500 dark:text-cyan-400 font-semibold'>Ventec</p>
            <h1 className='hidden md:block text-base font-semibold text-slate-900 dark:text-white leading-tight'>Plateforme RH</h1>
          </div>
        </div>
        <nav className='flex items-center gap-3'>
          <span className='hidden sm:block text-xs text-slate-500 font-medium'>Application interne</span>
          <div className='hidden sm:block w-px h-4 bg-slate-200 dark:bg-white/10' />
          <ThemeToggle />
          <button onClick={login}
            className='btn-glow flex items-center gap-2 rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 hover:bg-cyan-400 transition-colors'>
            Connexion <HiArrowRight className='w-4 h-4' />
          </button>
        </nav>
      </header>

      {/* ── Hero ── */}
      <main className='relative z-10'>
        <div className='mx-auto max-w-7xl px-6 pt-24 pb-12 lg:px-8'>
          <div className='flex flex-col items-center text-center'>

            <div className='h-badge mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2'>
              <div className='h-1.5 w-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-pulse' />
              <span className='text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300'>
                Application Interne · Ventec
              </span>
            </div>

            <h2 className='h-title max-w-4xl text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl'>
              Gérez vos{' '}
              <span className='grad-anim bg-gradient-to-r from-cyan-500 via-sky-400 to-violet-500 dark:from-cyan-400 dark:via-sky-300 dark:to-violet-400 bg-clip-text text-transparent'>
                Ressources Humaines
              </span>
              {' '}avec précision
            </h2>

            <p className='h-sub mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-400 leading-relaxed'>
              Plateforme centralisée pour le recrutement, la gestion des talents et le suivi
              des performances au sein de Ventec.
            </p>

            <div className='h-cta mt-10 flex flex-col sm:flex-row items-center gap-4'>
              <button onClick={login}
                className='btn-glow inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-sky-500 px-8 py-3.5 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20'>
                Accéder à la plateforme <HiArrowRight className='w-4 h-4' />
              </button>
              <div className='flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400'>
                {['Accès sécurisé', 'Usage interne'].map((t) => (
                  <span key={t} className='flex items-center gap-1.5'>
                    <HiCheckCircle className='w-4 h-4 text-emerald-500' />{t}
                  </span>
                ))}
              </div>
            </div>

          </div>

          {/* ── Dashboard mock-up ── */}
          <div className='h-dash mt-20 relative'>
            <div className='absolute -inset-4 rounded-[2.5rem] bg-gradient-to-b from-cyan-500/8 to-violet-500/5 blur-2xl' />
            <div className='relative rounded-[2rem] border border-slate-300 dark:border-white/[0.07] bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl shadow-black/5 dark:shadow-black/40 p-6 sm:p-8'>

              {/* Mockup header */}
              <div className='flex items-center justify-between mb-5'>
                <div>
                  <p className='text-[10px] uppercase tracking-widest text-cyan-500 dark:text-cyan-400 font-semibold'>Tableau de bord</p>
                  <p className='text-base font-semibold text-slate-900 dark:text-white mt-0.5'>Vue d'ensemble RH · Ventec</p>
                </div>
                <div className='flex items-center gap-2'>
                  <div className='h-2 w-2 rounded-full bg-emerald-400 animate-pulse' />
                  <span className='text-xs text-slate-500 dark:text-slate-400'>En ligne</span>
                </div>
              </div>

              {/* KPI cards — exact match to real app */}
              <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4'>
                {[
                  { label: 'Total candidats',        value: '84', sub: null,              numG: 'from-violet-900 to-violet-600',   barG: 'from-violet-500 to-violet-700',   Icon: MdPeople },
                  { label: 'Offres actives',          value: '8',  sub: 'sur 12 au total', numG: 'from-blue-900 to-blue-600',       barG: 'from-blue-500 to-blue-700',       Icon: MdWork },
                  { label: 'Candidatures',            value: '47', sub: null,              numG: 'from-orange-900 to-orange-600',   barG: 'from-orange-500 to-orange-700',   Icon: MdAccountTree },
                  { label: 'Entretiens cette sem.',   value: '6',  sub: null,              numG: 'from-emerald-900 to-emerald-600', barG: 'from-emerald-500 to-emerald-700', Icon: MdEvent },
                ].map((m) => (
                  <div key={m.label} className='relative overflow-hidden rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-white/[0.04] p-3 sm:p-4'>
                    <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${m.barG}`} />
                    <div className='relative flex items-start justify-between gap-2 pt-1'>
                      <div className='min-w-0 flex-1'>
                        <p className='text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-tight'>{m.label}</p>
                        <p className={`text-xl sm:text-2xl font-extrabold mt-1.5 bg-gradient-to-br ${m.numG} bg-clip-text text-transparent tabular-nums leading-none`}>{m.value}</p>
                        {m.sub && <p className='text-[9px] text-slate-400 mt-0.5'>{m.sub}</p>}
                      </div>
                      <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br ${m.barG} shadow-sm`}>
                        <m.Icon className='w-3.5 h-3.5 sm:w-4 sm:h-4 text-white' />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Charts row */}
              <div className='grid grid-cols-1 sm:grid-cols-5 gap-3 mb-4'>

                {/* Bar chart — entonnoir de recrutement */}
                <div className='sm:col-span-3 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] p-4'>
                  <p className='text-[10px] font-semibold text-slate-700 dark:text-slate-200 mb-0.5'>Entonnoir de recrutement</p>
                  <p className='text-[9px] text-slate-400 mb-3'>Vue d'ensemble du pipeline actuel</p>
                  <div className='flex items-end gap-2 h-20'>
                    {[
                      { label: 'Candidatures', pct: '100%', color: '#6366f1' },
                      { label: 'En attente',   pct: '62%',  color: '#f59e0b' },
                      { label: 'Entretiens',   pct: '30%',  color: '#3b82f6' },
                      { label: 'Embauchés',    pct: '13%',  color: '#10b981' },
                    ].map((bar) => (
                      <div key={bar.label} className='flex flex-col items-center gap-1 flex-1'>
                        <div className='w-full rounded-t-md' style={{ height: bar.pct, backgroundColor: bar.color, minHeight: '6px' }} />
                        <span className='text-[8px] text-slate-400 text-center leading-tight'>{bar.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Donut chart — statut des candidatures */}
                <div className='sm:col-span-2 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] p-4'>
                  <p className='text-[10px] font-semibold text-slate-700 dark:text-slate-200 mb-0.5'>Statut des candidatures</p>
                  <p className='text-[9px] text-slate-400 mb-3'>Répartition actuelle</p>
                  <div className='flex items-center gap-4'>
                    <div className='relative w-16 h-16 shrink-0'>
                      <div className='w-full h-full rounded-full' style={{ background: 'conic-gradient(#f59e0b 0deg 144deg, #6366f1 144deg 252deg, #3b82f6 252deg 306deg, #10b981 306deg 342deg, #ef4444 342deg 360deg)' }} />
                      <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white dark:bg-slate-900' />
                    </div>
                    <div className='space-y-1.5 flex-1'>
                      {[
                        { label: 'En attente',  color: '#f59e0b' },
                        { label: 'Sélectionné', color: '#6366f1' },
                        { label: 'Entretien',   color: '#3b82f6' },
                        { label: 'Embauché',    color: '#10b981' },
                        { label: 'Rejeté',      color: '#ef4444' },
                      ].map((s) => (
                        <div key={s.label} className='flex items-center gap-1.5'>
                          <div className='w-2 h-2 rounded-full shrink-0' style={{ backgroundColor: s.color }} />
                          <span className='text-[9px] text-slate-500 dark:text-slate-400'>{s.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Blue hired banner */}
              <div className='relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-xl p-4 mb-4'>
                <div className='absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white opacity-[0.04]' />
                <div className='relative flex items-center justify-between gap-4'>
                  <div>
                    <p className='text-blue-200 text-[9px] font-semibold uppercase tracking-widest mb-0.5'>Ce mois-ci</p>
                    <div className='flex items-end gap-2'>
                      <p className='text-white text-3xl font-extrabold leading-none'>3</p>
                      <p className='text-blue-200 text-xs font-medium mb-0.5'>embauches confirmées</p>
                    </div>
                  </div>
                  <div className='flex gap-5 shrink-0'>
                    {[{ v: '84', l: 'Candidats' }, { v: '47', l: 'Candidatures' }, { v: '8', l: 'Offres actives' }].map((s) => (
                      <div key={s.l} className='text-center'>
                        <p className='text-xl font-extrabold text-white'>{s.v}</p>
                        <p className='text-blue-200 text-[9px] mt-0.5'>{s.l}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Upcoming interviews */}
              <div className='rounded-xl border border-slate-200 dark:border-white/[0.06] overflow-hidden'>
                <div className='px-4 py-2.5 border-b border-slate-100 dark:border-white/[0.05] bg-slate-50 dark:bg-white/[0.02] flex items-center gap-2'>
                  <div className='w-5 h-5 rounded-md bg-blue-50 dark:bg-blue-950 flex items-center justify-center shrink-0'>
                    <MdCalendarMonth className='w-3 h-3 text-blue-500' />
                  </div>
                  <p className='text-[9px] uppercase tracking-widest text-slate-400 font-semibold'>Entretiens à venir</p>
                </div>
                <div className='divide-y divide-slate-100 dark:divide-white/[0.04]'>
                  {[
                    { name: 'Yassine El Amrani', post: 'Dev Full Stack', date: '04 août', time: '10:00', emoji: '🎥' },
                    { name: 'Sara Idrissi',       post: 'Chargée RH',     date: '05 août', time: '14:30', emoji: '🏢' },
                  ].map((iv) => (
                    <div key={iv.name} className='flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors'>
                      <div className='w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center text-xs shrink-0'>{iv.emoji}</div>
                      <div className='min-w-0 flex-1'>
                        <p className='text-xs font-semibold text-slate-800 dark:text-slate-200 truncate'>{iv.name}</p>
                        <p className='text-[9px] text-slate-400'>{iv.post}</p>
                      </div>
                      <div className='text-right shrink-0'>
                        <p className='text-[10px] font-semibold text-slate-600 dark:text-slate-300'>{iv.date}</p>
                        <p className='text-[9px] text-slate-400'>{iv.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* ── Stats strip ── */}
      <section className='relative z-10 border-t border-slate-300 dark:border-white/[0.06] py-14'>
        <div className='mx-auto max-w-5xl px-6'>
          <div className='grid grid-cols-2 sm:grid-cols-4 gap-8 text-center'>
            {[
              { value: '6',   label: 'Modules RH intégrés',    color: 'text-cyan-500 dark:text-cyan-400' },
              { value: 'IA',  label: 'Scoring automatique',     color: 'text-violet-500 dark:text-violet-400' },
              { value: '5',   label: 'Étapes de pipeline',      color: 'text-sky-500 dark:text-sky-400' },
              { value: 'PDF', label: 'Export de checklists',    color: 'text-emerald-500 dark:text-emerald-400' },
            ].map((s, i) => (
              <div key={s.label} data-reveal style={{ '--rv-delay': `${i * 150}ms` }}>
                <p className={`text-3xl sm:text-4xl font-extrabold ${s.color}`}>{s.value}</p>
                <p className='mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium'>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className='relative z-10 border-t border-slate-300 dark:border-white/[0.06] py-24'>
        <div className='mx-auto max-w-6xl px-6'>
          <div data-reveal className='text-center mb-14'>
            <p className='text-[11px] uppercase tracking-[0.3em] text-cyan-500 dark:text-cyan-400 font-semibold mb-3'>Fonctionnalités</p>
            <h3 className='text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white'>Tout ce dont vous avez besoin</h3>
            <p className='mt-4 text-slate-600 dark:text-slate-400 max-w-xl mx-auto'>
              Un ensemble complet d'outils RH pensés pour les besoins spécifiques de Ventec.
            </p>
          </div>

          <div className='grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3'>
            {features.map((feat, i) => (
              <div key={feat.title} data-reveal style={{ '--rv-delay': `${i * 120}ms` }}>
                <div className='feat-card h-full flex flex-col items-start rounded-2xl border border-slate-300 dark:border-white/[0.07] bg-white/60 dark:bg-white/[0.03] p-4 sm:p-6 hover:bg-white dark:hover:bg-white/[0.06] hover:border-slate-400 dark:hover:border-white/[0.13]'>
                  <div className={`feat-icon inline-flex rounded-xl p-3 mb-3 sm:mb-4 ${iconColorMap[feat.color]}`}>
                    <feat.icon className='w-5 h-5' />
                  </div>
                  <h4 className='text-sm font-semibold text-slate-900 dark:text-white mb-1 sm:mb-2 leading-snug'>{feat.title}</h4>
                  <p className='text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed'>{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Spotlight ── */}
      <section className='relative z-10 border-t border-slate-300 dark:border-white/[0.06] py-24 overflow-hidden bg-violet-50/60 dark:bg-transparent'>
        <div className='absolute inset-0 dark:bg-gradient-to-br dark:from-slate-900 dark:to-[#06080f]' />
        <div className='absolute top-0 right-0 w-[500px] h-[500px] bg-violet-500/[0.06] dark:bg-violet-600/10 rounded-full blur-[100px] pointer-events-none' />
        <div className='absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-500/[0.06] dark:bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none' />
        <div className='relative mx-auto max-w-6xl px-6'>
          <div className='grid lg:grid-cols-2 gap-12 items-center'>

            {/* Left text */}
            <div data-reveal="left">
              <div className='inline-flex items-center gap-2 rounded-full border border-violet-400/30 dark:border-violet-500/20 bg-violet-100 dark:bg-violet-500/10 px-4 py-2 mb-6'>
                <MdAutoAwesome className='w-4 h-4 text-violet-600 dark:text-violet-400' />
                <span className='text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400'>Intelligence Artificielle</span>
              </div>
              <h3 className='text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-5 leading-tight'>
                L'IA analyse les CVs,<br />
                <span className='bg-gradient-to-r from-cyan-500 to-violet-500 dark:from-cyan-400 dark:to-violet-400 bg-clip-text text-transparent'>
                  vous recrutez les talents
                </span>
              </h3>
              <p className='text-slate-600 dark:text-slate-400 leading-relaxed mb-8 text-sm sm:text-base'>
                Chaque candidature est automatiquement analysée par notre moteur IA.
                Un score de correspondance de 0 à 100 est attribué en fonction de l'adéquation
                entre le profil et la fiche de poste.
              </p>
              <div className='space-y-3'>
                {[
                  { label: 'Analyse instantanée du CV',             light: 'text-cyan-600',    dark: 'dark:text-cyan-400' },
                  { label: 'Score de correspondance 0–100',         light: 'text-violet-600',  dark: 'dark:text-violet-400' },
                  { label: 'Résumé IA personnalisé par candidat',   light: 'text-sky-600',     dark: 'dark:text-sky-400' },
                  { label: 'Tri automatique des meilleurs profils', light: 'text-emerald-600', dark: 'dark:text-emerald-400' },
                ].map((item) => (
                  <div key={item.label} className='flex items-center gap-3'>
                    <MdCheckCircle className={`w-4 h-4 shrink-0 ${item.light} ${item.dark}`} />
                    <span className='text-sm text-slate-600 dark:text-slate-300'>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: AI score card */}
            <div data-reveal="right" className='ai-card relative'>
              <div className='absolute -inset-4 bg-gradient-to-br from-cyan-500/10 to-violet-500/10 rounded-3xl blur-xl' />
              <div className='relative rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.05] shadow-sm dark:shadow-none p-6 space-y-4'>
                <div className='flex items-center justify-between'>
                  <p className='text-[10px] uppercase tracking-widest text-slate-400 font-semibold'>Analyse IA · Résultat</p>
                  <span className='inline-flex items-center gap-1.5 text-[10px] bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full font-semibold'>
                    <div className='w-1.5 h-1.5 bg-emerald-500 dark:bg-emerald-400 rounded-full animate-pulse' />Traité
                  </span>
                </div>

                {/* Candidate row */}
                <div className='flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.07]'>
                  <div className='w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0'>Y</div>
                  <div>
                    <p className='text-sm font-semibold text-slate-900 dark:text-white'>Yassine El Amrani</p>
                    <p className='text-xs text-slate-500 dark:text-slate-400'>Développeur Full Stack · 5 ans exp.</p>
                  </div>
                </div>

                {/* Score bar */}
                <div className='p-4 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06]'>
                  <div className='flex items-center justify-between mb-3'>
                    <span className='text-xs text-slate-500 dark:text-slate-400 font-medium'>Score de correspondance</span>
                    <span className='inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'>
                      <MdStar className='w-3.5 h-3.5' />87/100
                    </span>
                  </div>
                  <div className='w-full bg-slate-200 dark:bg-white/[0.06] rounded-full h-2'>
                    <div className='score-bar h-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500' />
                  </div>
                </div>

                {/* AI summary */}
                <div className='p-3 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20'>
                  <p className='text-[10px] uppercase tracking-wider text-violet-600 dark:text-violet-400 font-semibold mb-1.5'>Résumé IA</p>
                  <p className='text-xs text-slate-600 dark:text-slate-300 leading-relaxed'>
                    Profil très pertinent pour le poste. Expérience solide en React et Spring Boot.
                    Compétences techniques alignées avec les exigences de l'offre.
                  </p>
                </div>

                {/* Skill chips */}
                <div className='flex flex-wrap gap-2'>
                  {['React', 'Spring Boot', 'Docker', 'PostgreSQL'].map((skill) => (
                    <span key={skill} className='px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-100 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-500/20'>{skill}</span>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Pipeline ── */}
      <section className='relative z-10 border-t border-slate-300 dark:border-white/[0.06] py-24'>
        <div className='mx-auto max-w-5xl px-6'>
          <div data-reveal className='text-center mb-14'>
            <p className='text-[11px] uppercase tracking-[0.3em] text-violet-500 dark:text-violet-400 font-semibold mb-3'>Processus</p>
            <h3 className='text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white'>Pipeline de recrutement</h3>
            <p className='mt-4 text-slate-600 dark:text-slate-400 max-w-xl mx-auto text-sm'>
              Suivez chaque candidat à travers les étapes structurées du processus de recrutement Ventec.
            </p>
          </div>

          <div className='relative grid sm:grid-cols-4 gap-6'>
            <div className='hidden sm:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-white/[0.1] to-transparent' />
            {pipeline.map((p, i) => (
              <div key={p.step} data-reveal style={{ '--rv-delay': `${i * 160}ms` }}>
                <div className='pipe-step relative flex flex-col items-center text-center gap-3'>
                  <div className={`h-16 w-16 rounded-2xl flex items-center justify-center text-lg font-bold border ${stepColorMap[p.color]}`}>
                    {p.step}
                  </div>
                  <p className='text-sm font-semibold text-slate-900 dark:text-white'>{p.title}</p>
                  <p className='text-xs text-slate-500 leading-relaxed'>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className='relative z-10 border-t border-slate-300 dark:border-white/[0.06] py-20'>
        <div className='mx-auto max-w-3xl px-6'>
          <div className='relative rounded-[2rem] border border-slate-300 dark:border-white/[0.08] bg-slate-200 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl shadow-black/5 dark:shadow-black/30 overflow-hidden p-10 sm:p-14 text-center'>
            <div className='absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-violet-500/5 pointer-events-none' />
            <div data-reveal="scale" className='relative'>
              <HiOfficeBuilding className='w-10 h-10 text-cyan-500 dark:text-cyan-400 mx-auto mb-5 transition-transform duration-300 hover:scale-110' />
              <h3 className='text-3xl font-bold text-slate-900 dark:text-white'>Prêt à commencer ?</h3>
              <p className='mt-3 text-slate-600 dark:text-slate-400'>
                Connectez-vous avec votre compte Ventec pour accéder à la plateforme RH.
              </p>
              <div className='mt-8'>
                <button onClick={login}
                  className='btn-glow inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-sky-500 px-8 py-3.5 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20'>
                  Se connecter <HiArrowRight className='w-4 h-4' />
                </button>
              </div>
              <div className='mt-7 flex flex-wrap justify-center gap-5 text-sm text-slate-500'>
                {['Accès sécurisé', 'Usage interne uniquement', 'Données confidentielles'].map((label) => (
                  <div key={label} className='flex items-center gap-1.5 transition-colors duration-200 hover:text-slate-700 dark:hover:text-slate-300'>
                    <HiCheckCircle className='w-4 h-4 text-emerald-500' />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className='relative z-10 border-t border-slate-300 dark:border-white/[0.06] py-8'>
        <div className='mx-auto flex max-w-7xl flex-col gap-3 px-6 text-slate-500 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex items-center gap-3'>
            <img src={logo} alt='Ventec logo' className='h-6 w-auto rounded opacity-40 dark:opacity-50' />
            <p className='text-xs'>Plateforme RH interne · Ventec © 2026</p>
          </div>
          <div className='flex flex-wrap gap-6 text-xs'>
            <button onClick={login} className='nav-link text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors'>Connexion</button>
            <a href='https://www.ventec.ma/fr/' target='_blank' rel='noreferrer'
              className='nav-link text-cyan-500 dark:text-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors'>
              Site officiel Ventec
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
};
