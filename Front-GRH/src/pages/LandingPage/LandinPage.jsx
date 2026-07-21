import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import {
  HiUserGroup, HiBriefcase, HiChartBar, HiClipboardCheck,
  HiArrowRight, HiCheckCircle, HiLightningBolt, HiShieldCheck,
  HiOfficeBuilding, HiClock,
} from 'react-icons/hi';
import logo from '../../assets/Ventec-logo.jpeg';

export const LandingPage = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoaded && isSignedIn) navigate('/home', { replace: true });
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded) {
    return (
      <div className='bg-slate-950 text-white h-screen flex flex-col items-center justify-center'>
        <div className='h-12 w-12 rounded-full border-4 border-cyan-400 border-t-transparent animate-spin' />
        <span className='mt-4 text-base font-medium text-slate-100'>Chargement...</span>
      </div>
    );
  }

  const features = [
    { icon: HiBriefcase,     color: 'cyan',    title: 'Gestion du recrutement', desc: 'Publiez des offres, suivez les candidatures et gérez votre pipeline de recrutement de A à Z.' },
    { icon: HiUserGroup,     color: 'violet',  title: 'Gestion des talents',     desc: 'Centralisez les profils, compétences et parcours professionnels dans un seul espace sécurisé.' },
    { icon: HiChartBar,      color: 'sky',     title: 'Tableaux de bord RH',     desc: 'Indicateurs clés et rapports en temps réel pour piloter vos décisions avec précision.' },
    { icon: HiClipboardCheck,color: 'emerald', title: 'Suivi des entretiens',    desc: 'Planifiez et évaluez les entretiens avec des grilles structurées et un historique complet.' },
    { icon: HiShieldCheck,   color: 'rose',    title: 'Accès sécurisé',          desc: "Authentification robuste avec gestion des rôles et permissions par niveau d'accès." },
    { icon: HiLightningBolt, color: 'amber',   title: 'Workflows automatisés',   desc: "Automatisez notifications, validations et rappels pour gagner du temps sur l'administration." },
  ];

  const pipeline = [
    { step: '01', title: 'Offre publiée',  desc: "Création et diffusion de l'offre", color: 'cyan' },
    { step: '02', title: 'Candidatures',   desc: 'Réception et tri des profils',      color: 'sky' },
    { step: '03', title: 'Entretiens',     desc: 'Évaluation des candidats',          color: 'violet' },
    { step: '04', title: 'Recrutement',    desc: 'Décision et intégration',           color: 'emerald' },
  ];

  const iconColorMap = {
    cyan:    'bg-cyan-500/15 text-cyan-400',
    violet:  'bg-violet-500/15 text-violet-400',
    sky:     'bg-sky-500/15 text-sky-400',
    emerald: 'bg-emerald-500/15 text-emerald-400',
    rose:    'bg-rose-500/15 text-rose-400',
    amber:   'bg-amber-500/15 text-amber-400',
  };

  const stepColorMap = {
    cyan:    'bg-cyan-500/15 text-cyan-300 border-cyan-500/25',
    sky:     'bg-sky-500/15 text-sky-300 border-sky-500/25',
    violet:  'bg-violet-500/15 text-violet-300 border-violet-500/25',
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  };

  return (
    <div className='min-h-screen bg-slate-950 text-white'>

      {/* ── Keyframes (hero only — scroll-reveal uses inline style transitions) ── */}
      <style>{`
        @keyframes fadeInUp   { from { opacity:0; transform:translateY(28px) } to { opacity:1; transform:none } }
        @keyframes fadeInDown { from { opacity:0; transform:translateY(-18px) } to { opacity:1; transform:none } }
        @keyframes float      { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-20px) } }

        .h-badge  { animation: fadeInDown 0.7s cubic-bezier(.16,1,.3,1) 0.08s both }
        .h-title  { animation: fadeInUp   0.85s cubic-bezier(.16,1,.3,1) 0.25s both }
        .h-sub    { animation: fadeInUp   0.85s cubic-bezier(.16,1,.3,1) 0.42s both }
        .h-cta    { animation: fadeInUp   0.85s cubic-bezier(.16,1,.3,1) 0.56s both }
        .h-dash   { animation: fadeInUp   1.0s  cubic-bezier(.16,1,.3,1) 0.72s both }
        .a-header { animation: fadeInDown 0.55s cubic-bezier(.16,1,.3,1) 0s   both }

        .orb-1 { animation: float  9s ease-in-out 0s   infinite }
        .orb-2 { animation: float 11s ease-in-out 1.8s infinite }
        .orb-3 { animation: float 13s ease-in-out 3.5s infinite }

        /* hover micro-interactions */
        .feat-card { transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease, background-color .25s ease }
        .feat-card:hover { transform: translateY(-4px); box-shadow: 0 20px 40px -12px rgba(0,0,0,.5) }
        .feat-icon { transition: transform .3s cubic-bezier(.16,1,.3,1) }
        .feat-card:hover .feat-icon { transform: scale(1.15) rotate(-4deg) }

        .btn-glow { transition: transform .2s ease, box-shadow .3s ease }
        .btn-glow:hover { transform: scale(1.05); box-shadow: 0 0 32px rgba(34,211,238,.35), 0 8px 24px rgba(34,211,238,.2) }

        .pipe-step { transition: transform .25s ease }
        .pipe-step:hover { transform: translateY(-5px) }

        .nav-link { position:relative }
        .nav-link::after { content:''; position:absolute; bottom:-2px; left:0; width:0; height:1px; background:currentColor; transition:width .3s ease }
        .nav-link:hover::after { width:100% }
      `}</style>

      {/* ── Ambient orbs ── */}
      <div className='fixed inset-0 pointer-events-none' style={{ zIndex: 0 }}>
        <div className='orb-1 absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[120px]' />
        <div className='orb-2 absolute top-[35%] right-[-15%] w-[500px] h-[500px] rounded-full bg-violet-500/10 blur-[120px]' />
        <div className='orb-3 absolute bottom-[5%] left-[15%] w-[400px] h-[400px] rounded-full bg-sky-500/8 blur-[100px]' />
        <div className='absolute inset-0 opacity-[0.018]'
          style={{ backgroundImage:'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize:'28px 28px' }} />
      </div>

      {/* ── Header ── */}
      <header className='a-header relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5 border-b border-white/[0.06]'>
        <div className='flex items-center gap-3'>
          <img src={logo} alt='Ventec logo'
            className='h-10 w-auto rounded-lg object-cover border border-white/20 shadow-lg shadow-cyan-500/10 transition-transform duration-300 hover:scale-105' />
          <div>
            <p className='hidden md:block text-[10px] uppercase tracking-[0.35em] text-cyan-400 font-semibold'>Ventec</p>
            <h1 className='hidden md:block text-base font-semibold text-white leading-tight'>Plateforme RH</h1>
          </div>
        </div>
        <nav className='flex items-center gap-4'>
          <span className='hidden sm:block text-xs text-slate-500 font-medium'>Application interne</span>
          <div className='hidden sm:block w-px h-4 bg-white/10' />
          <Link to='/signin'
            className='btn-glow flex items-center gap-2 rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 hover:bg-cyan-400 transition-colors'>
            Connexion <HiArrowRight className='w-4 h-4' />
          </Link>
        </nav>
      </header>

      {/* ── Hero ── */}
      <main className='relative z-10'>
        <div className='mx-auto max-w-7xl px-6 pt-24 pb-12 lg:px-8'>
          <div className='flex flex-col items-center text-center'>

            <div className='h-badge mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2'>
              <div className='h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse' />
              <span className='text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300'>
                Application Interne · Ventec
              </span>
            </div>

            <h2 className='h-title max-w-4xl text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl'>
              Gérez vos{' '}
              <span className='bg-gradient-to-r from-cyan-400 via-sky-300 to-violet-400 bg-clip-text text-transparent'>
                Ressources Humaines
              </span>
              {' '}avec précision
            </h2>

            <p className='h-sub mt-6 max-w-2xl text-lg text-slate-400 leading-relaxed'>
              Plateforme centralisée pour le recrutement, la gestion des talents et le suivi
              des performances au sein de Ventec.
            </p>

            <div className='h-cta mt-10'>
              <Link to='/signin'
                className='btn-glow inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-sky-500 px-8 py-3.5 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20'>
                Accéder à la plateforme <HiArrowRight className='w-4 h-4' />
              </Link>
            </div>

          </div>

          {/* ── Dashboard mock-up ── */}
          <div className='h-dash mt-20 relative'>
            <div className='absolute -inset-4 rounded-[2.5rem] bg-gradient-to-b from-cyan-500/8 to-violet-500/5 blur-2xl' />
            <div className='relative rounded-[2rem] border border-white/[0.07] bg-slate-900/60 backdrop-blur-xl shadow-2xl shadow-black/40 p-6 sm:p-8'>

              <div className='flex items-center justify-between mb-6'>
                <div>
                  <p className='text-[10px] uppercase tracking-widest text-cyan-400 font-semibold'>Tableau de bord</p>
                  <p className='text-base font-semibold text-white mt-0.5'>Vue d'ensemble RH · Ventec</p>
                </div>
                <div className='flex items-center gap-2'>
                  <div className='h-2 w-2 rounded-full bg-emerald-400 animate-pulse' />
                  <span className='text-xs text-slate-400'>En ligne</span>
                </div>
              </div>

              <div className='grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6'>
                {[
                  { label: 'Total Employés', value: '152', icon: HiUserGroup,      color: 'cyan',    sub: '+3 ce mois' },
                  { label: 'Postes ouverts', value: '8',   icon: HiBriefcase,      color: 'violet',  sub: '2 urgents' },
                  { label: 'Candidatures',   value: '47',  icon: HiClipboardCheck, color: 'sky',     sub: '+12 cette semaine' },
                  { label: 'Entretiens',     value: '6',   icon: HiClock,          color: 'emerald', sub: 'Cette semaine' },
                ].map((m) => (
                  <div key={m.label}
                    className='rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4 transition-all duration-300 hover:bg-white/[0.07] hover:border-white/[0.12] hover:-translate-y-1'>
                    <div className={`inline-flex rounded-xl p-2 ${iconColorMap[m.color]}`}>
                      <m.icon className='w-4 h-4' />
                    </div>
                    <p className='mt-3 text-2xl font-bold text-white'>{m.value}</p>
                    <p className='text-xs text-slate-500 mt-0.5'>{m.label}</p>
                    <p className='text-[10px] text-slate-600 mt-1'>{m.sub}</p>
                  </div>
                ))}
              </div>

              <div className='grid sm:grid-cols-2 gap-4'>
                <div className='rounded-2xl bg-white/[0.03] border border-white/[0.05] p-5 transition-colors duration-300 hover:bg-white/[0.05]'>
                  <p className='text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-4'>Dernières candidatures</p>
                  <div className='space-y-3'>
                    {[
                      { name: 'Ahmed Benali',   post: 'Dev Full Stack', status: 'Entretien', color: 'cyan' },
                      { name: 'Sara Moussaoui', post: 'Chargée RH',    status: 'En cours',  color: 'amber' },
                      { name: 'Karim Idrissi',  post: 'Chef de projet', status: 'Validé',    color: 'emerald' },
                    ].map((c) => {
                      const sMap = { cyan:'bg-cyan-500/15 text-cyan-300', amber:'bg-amber-500/15 text-amber-300', emerald:'bg-emerald-500/15 text-emerald-300' };
                      return (
                        <div key={c.name} className='flex items-center justify-between group/row'>
                          <div className='flex items-center gap-2.5'>
                            <div className='h-7 w-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300 shrink-0 transition-transform duration-200 group-hover/row:scale-110'>
                              {c.name[0]}
                            </div>
                            <div>
                              <p className='text-xs font-medium text-slate-200'>{c.name}</p>
                              <p className='text-[10px] text-slate-600'>{c.post}</p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${sMap[c.color]}`}>{c.status}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className='rounded-2xl bg-white/[0.03] border border-white/[0.05] p-5 transition-colors duration-300 hover:bg-white/[0.05]'>
                  <p className='text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-4'>Postes ouverts</p>
                  <div className='space-y-3'>
                    {[
                      { title: 'Développeur Backend',    dept: 'IT',         count: 2 },
                      { title: 'Responsable Commercial', dept: 'Ventes',     count: 1 },
                      { title: 'Ingénieur Qualité',      dept: 'Production', count: 3 },
                    ].map((job) => (
                      <div key={job.title} className='flex items-center justify-between'>
                        <div>
                          <p className='text-xs font-medium text-slate-200'>{job.title}</p>
                          <p className='text-[10px] text-slate-600'>{job.dept}</p>
                        </div>
                        <div className='flex items-center gap-1 text-slate-500'>
                          <HiUserGroup className='w-3 h-3' />
                          <span className='text-[10px]'>{job.count} poste{job.count > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Features ── */}
      <section className='relative z-10 border-t border-white/[0.06] py-24'>
        <div className='mx-auto max-w-6xl px-6'>

          <div className='text-center mb-14'>
            <p className='text-[11px] uppercase tracking-[0.3em] text-cyan-400 font-semibold mb-3'>Fonctionnalités</p>
            <h3 className='text-3xl sm:text-4xl font-bold text-white'>Tout ce dont vous avez besoin</h3>
            <p className='mt-4 text-slate-400 max-w-xl mx-auto'>
              Un ensemble complet d'outils RH pensés pour les besoins spécifiques de Ventec.
            </p>
          </div>

          <div className='grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3'>
            {features.map((feat) => (
              <div
                key={feat.title}
                className='feat-card aspect-square sm:aspect-auto flex flex-col items-center justify-center text-center sm:items-start sm:justify-start sm:text-left rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 sm:p-6 overflow-hidden hover:bg-white/[0.06] hover:border-white/[0.13]'
              >
                <div className={`feat-icon inline-flex rounded-xl p-3 mb-3 sm:mb-4 ${iconColorMap[feat.color]}`}>
                  <feat.icon className='w-6 h-6 sm:w-5 sm:h-5' />
                </div>
                <h4 className='text-sm font-semibold text-white mb-1 sm:mb-2 leading-snug'>{feat.title}</h4>
                <p className='text-xs sm:text-sm text-slate-400 leading-relaxed line-clamp-2 sm:line-clamp-none'>{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pipeline ── */}
      <section className='relative z-10 border-t border-white/[0.06] py-24'>
        <div className='mx-auto max-w-5xl px-6'>

          <div className='text-center mb-14'>
            <p className='text-[11px] uppercase tracking-[0.3em] text-violet-400 font-semibold mb-3'>Processus</p>
            <h3 className='text-3xl sm:text-4xl font-bold text-white'>Pipeline de recrutement</h3>
          </div>

          <div className='relative grid sm:grid-cols-4 gap-6'>
            <div className='hidden sm:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent' />

            {pipeline.map((p) => (
              <div
                key={p.step}
                className='pipe-step relative flex flex-col items-center text-center gap-3'
              >
                <div className={`h-16 w-16 rounded-2xl flex items-center justify-center text-lg font-bold border ${stepColorMap[p.color]}`}>
                  {p.step}
                </div>
                <p className='text-sm font-semibold text-white'>{p.title}</p>
                <p className='text-xs text-slate-500 leading-relaxed'>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className='relative z-10 border-t border-white/[0.06] py-20'>
        <div className='mx-auto max-w-3xl px-6'>
          <div
            className='relative rounded-[2rem] border border-white/[0.08] bg-slate-900/60 backdrop-blur-xl shadow-2xl shadow-black/30 overflow-hidden p-10 sm:p-14 text-center'
          >
            <div className='absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-violet-500/5 pointer-events-none' />
            <div className='relative'>
              <HiOfficeBuilding className='w-10 h-10 text-cyan-400 mx-auto mb-5 transition-transform duration-300 hover:scale-110' />
              <h3 className='text-3xl font-bold text-white'>Prêt à commencer ?</h3>
              <p className='mt-3 text-slate-400'>
                Connectez-vous avec votre compte Ventec pour accéder à la plateforme RH.
              </p>
              <div className='mt-8'>
                <Link to='/signin'
                  className='btn-glow inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-sky-500 px-8 py-3.5 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20'>
                  Se connecter <HiArrowRight className='w-4 h-4' />
                </Link>
              </div>
              <div className='mt-7 flex flex-wrap justify-center gap-5 text-sm text-slate-500'>
                {['Accès sécurisé', 'Usage interne uniquement', 'Données confidentielles'].map((label) => (
                  <div key={label} className='flex items-center gap-1.5 transition-colors duration-200 hover:text-slate-300'>
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
      <footer className='relative z-10 border-t border-white/[0.06] py-8'>
        <div className='mx-auto flex max-w-7xl flex-col gap-3 px-6 text-slate-500 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex items-center gap-3'>
            <img src={logo} alt='Ventec logo' className='h-6 w-auto rounded opacity-50' />
            <p className='text-xs'>Plateforme RH interne · Ventec © 2026</p>
          </div>
          <div className='flex flex-wrap gap-6 text-xs'>
            <Link to='/signin' className='nav-link text-slate-400 hover:text-white transition-colors'>Connexion</Link>
            <a href='https://www.ventec.ma/fr/' target='_blank' rel='noreferrer'
              className='nav-link text-cyan-400 hover:text-cyan-300 transition-colors'>
              Site officiel Ventec
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
