import { SignIn, SignInButton, useAuth } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HiShieldCheck, HiLightningBolt, HiChartBar, HiArrowRight } from 'react-icons/hi';
import logo from '../../assets/Ventec-logo.jpeg';

const DOT_BG = {
  backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.045) 1px, transparent 0)',
  backgroundSize: '28px 28px',
};

const FEATURES = [
  {
    icon: HiShieldCheck,
    label: 'Sécurité enterprise',
    desc: 'Contrôle d\'accès et authentification avancée',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
  },
  {
    icon: HiLightningBolt,
    label: 'Accès instantané',
    desc: 'Données RH disponibles en temps réel',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
  },
  {
    icon: HiChartBar,
    label: 'Rapports intelligents',
    desc: 'Analyses et insights automatisés',
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
  },
];

const STATS = [
  { value: '+150', label: 'Utilisateurs' },
  { value: '99.9%', label: 'Disponibilité' },
  { value: '<1s', label: 'Réponse' },
];

export const AuthPage = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isClerkFlowRoute =
    location.pathname.includes('/factor-one') ||
    location.pathname.includes('/verify') ||
    location.pathname.includes('/sso-callback');

  useEffect(() => {
    if (isLoaded && isSignedIn) navigate('/home', { replace: true });
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <div className="h-12 w-12 rounded-full border-4 border-cyan-400 border-t-transparent animate-spin" />
        <span className="mt-4 text-sm font-medium text-slate-400">Chargement en cours…</span>
      </div>
    );
  }

  if (isClerkFlowRoute) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-10" style={DOT_BG}>
        <div className="w-full max-w-3xl rounded-3xl bg-slate-900/95 p-6 sm:p-10 shadow-2xl border border-white/10">
          <SignIn routing="path" path="/signin" forceRedirectUrl="/home" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07090f]" style={DOT_BG}>
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute -top-48 -left-48 h-[560px] w-[560px] rounded-full bg-cyan-500/[0.07] blur-[130px]" />
      <div className="pointer-events-none absolute top-1/3 -right-20 h-[480px] w-[480px] rounded-full bg-violet-600/[0.09] blur-[110px]" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 h-[400px] w-[400px] rounded-full bg-sky-500/[0.07] blur-[110px]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.02] shadow-[0_40px_120px_-20px_rgba(0,0,0,0.95)] backdrop-blur-2xl">
          <div className="grid lg:grid-cols-[1.1fr_1fr]">

            {/* ── Left info panel ── */}
            <div className="hidden lg:flex flex-col justify-between px-12 py-14 border-r border-white/[0.07]">

              {/* Brand */}
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="absolute inset-0 rounded-xl bg-cyan-400/25 blur-lg" />
                  <img
                    src={logo}
                    alt="Ventec"
                    className="relative h-11 w-full md:w-auto rounded-xl object-cover border border-white/20 shadow-lg"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-400">Ventec</p>
                  <p className="text-xs font-medium text-white/50">Système RH</p>
                </div>
              </div>

              {/* Heading & description */}
              <div className="flex-1 flex flex-col justify-center py-14">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-500/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-cyan-400 mb-7">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  Plateforme nouvelle génération
                </div>

                <h1 className="text-[2.1rem] font-bold leading-tight tracking-tight text-white">
                  Gérez vos RH avec{' '}
                  <span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-400 bg-clip-text text-transparent">
                    intelligence
                  </span>
                </h1>

                <p className="mt-4 max-w-sm text-[0.9rem] leading-relaxed text-slate-500">
                  Accédez à votre espace RH Ventec pour piloter les employés, les congés, les évaluations et les rapports dans un seul outil.
                </p>

                {/* Feature list */}
                <div className="mt-10 space-y-5">
                  {FEATURES.map(({ icon: Icon, label, desc, color, bg }) => (
                    <div key={label} className="flex items-start gap-4">
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bg} ${color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white/90">{label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              
            </div>

            {/* ── Right auth panel ── */}
            <div className="flex flex-col justify-center px-8 py-14 sm:px-12 bg-slate-950/40">

              {/* Mobile logo */}
              <div className="flex flex-col lg:hidden items-center gap-3 mb-10">
                <img src={logo} alt="Ventec" className="h-9 w-auto rounded-xl object-cover border border-white/20" />
                <p className="text-sm font-bold text-white">Ventec RH</p>
              </div>

              {/* Header */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-400">
                  Connexion
                </p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">
                  Bienvenue
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Connectez-vous à votre espace Ventec RH
                </p>
              </div>

              {/* Buttons */}
              <div className="mt-9 space-y-3">
                <SignInButton mode="modal">
                  <button className="group w-full rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 px-5 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition-all duration-200 hover:shadow-cyan-500/35 hover:scale-[1.015] active:scale-[0.985]">
                    <span className="flex items-center justify-center gap-2">
                      Se connecter
                      <HiArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </span>
                  </button>
                </SignInButton>
              </div>

              {/* Divider */}
              <div className="my-8 flex items-center gap-4">
                <div className="flex-1 h-px bg-white/[0.07]" />
                <span className="text-xs text-slate-600 font-medium">ou</span>
                <div className="flex-1 h-px bg-white/[0.07]" />
              </div>

              {/* Trust badge */}
              <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10">
                  <HiShieldCheck className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white/80">Connexion sécurisée</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">Chiffrement de bout en bout · Certifié SOC 2</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
