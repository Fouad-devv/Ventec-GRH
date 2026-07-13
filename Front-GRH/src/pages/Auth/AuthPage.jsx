import { SignIn, SignUp, SignInButton, SignUpButton, useAuth } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../assets/Ventec-logo.jpeg';

export const AuthPage = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const mode = location.pathname.includes('/signup') ? 'signup' : 'signin';
  const isClerkFlowRoute = location.pathname.includes('/factor-one') || location.pathname.includes('/verify') || location.pathname.includes('/sso-callback');

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate('/home', { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <span className="text-xl font-semibold">Chargement...</span>
      </div>
    );
  }

  if (isClerkFlowRoute) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-3xl rounded-[2rem] bg-slate-900/95 p-6 sm:p-10 shadow-[0_25px_80px_-35px_rgba(0,0,0,0.8)]">
          {mode === 'signup' ? (
            <SignUp routing="path" path="/signup" forceRedirectUrl="/home" />
          ) : (
            <SignIn routing="path" path="/signin" forceRedirectUrl="/home" />
          )}
        </div>
      </div>
    );
  }

  
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-cyan-500/30 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-1/4 h-[420px] w-[420px] rounded-full bg-violet-500/20 blur-3xl" />
      <div className="pointer-events-none absolute left-0 bottom-0 h-[360px] w-[360px] rounded-full bg-sky-500/20 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full  rounded-[2rem] border border-white/10 bg-slate-900/95 shadow-[0_25px_80px_-45px_rgba(0,0,0,0.8)] backdrop-blur-xl">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <div className="hidden lg:block px-8 py-10 sm:px-12 sm:py-14">
              <div className="flex flex-col items-center gap-4">
                <img src={logo} alt="Ventec logo" className="h-14 w-auto rounded-2xl border border-white/20 object-cover shadow-lg" />
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Ventec RH</p>
                  <h1 className="mt-2 text-3xl font-semibold text-white">Tableau de bord RH intelligent</h1>
                </div>
              </div>

              <p className="mt-6 max-w-xl text-slate-300">
                Connectez-vous pour accéder à votre espace RH Ventec et gérer les employés, les congés, les évaluations, et les rapports dans un seul outil fluide.
              </p>

              <div className="mt-10 grid gap-4">
                <div className="rounded-3xl bg-slate-950/70 p-5">
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Sécurité</p>
                  <p className="mt-2 text-lg font-semibold text-white">Connexion sécurisée et gestion des accès</p>
                </div>
                <div className="rounded-3xl bg-slate-950/70 p-5">
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Productivité</p>
                  <p className="mt-2 text-lg font-semibold text-white">Accès rapide aux données RH essentielles</p>
                </div>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-white/5 p-5">
                  <p className="text-sm text-cyan-300">Utilisateurs</p>
                  <p className="mt-2 text-xl font-semibold text-white">+150</p>
                </div>
                <div className="rounded-3xl bg-white/5 p-5">
                  <p className="text-sm text-cyan-300">Processus</p>
                  <p className="mt-2 text-xl font-semibold text-white">Onboarding rapide</p>
                </div>
              </div>
            </div>

            <div className="border-l border-white/10 bg-slate-950/90 px-8 py-10 sm:px-10 sm:py-12">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Connexion</p>
                  <h2 className="mt-2 text-3xl font-semibold text-white">Bienvenue</h2>
                </div>
                <div className="inline-flex rounded-full bg-slate-800/80 px-4 py-2 text-sm text-slate-300">Ventec RH</div>
              </div>

              <div className="mt-8 space-y-4">
                <div className="rounded-3xl bg-white/5 p-5">
                  <p className="text-sm text-slate-400">Authentification</p>
                  <p className="mt-2 text-xl font-semibold text-white">Accédez à votre compte sécurisé</p>
                </div>
                <div className="flex flex-col gap-3">
                  <SignInButton mode="modal">
                    <button className="w-full rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400">
                      Se connecter
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="w-full rounded-2xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                      Créer un compte
                    </button>
                  </SignUpButton>
                </div>
              </div>

              <div className="mt-10 rounded-3xl bg-slate-900/80 p-5 text-sm text-slate-400">
                <p className="font-semibold text-white">Besoin d'aide ?</p>
                <p className="mt-2">Vous pouvez créer un compte, vous connecter ou réinitialiser votre mot de passe directement ici.</p>
              </div>

              <div className="mt-8 text-center text-sm text-slate-500">
                {mode === 'signup' ? (
                  <span>Déjà membre ? <a href="/signin" className="font-semibold text-white hover:text-cyan-300">Se connecter</a></span>
                ) : (
                  <span>Pas encore de compte ? <a href="/signup" className="font-semibold text-white hover:text-cyan-300">S'inscrire</a></span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
