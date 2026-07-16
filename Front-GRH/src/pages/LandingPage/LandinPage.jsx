import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import logo from '../../assets/Ventec-logo.jpeg';


export const LandingPage = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate('/home', { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded) {
    return (
      <div className='bg-slate-950 text-white h-screen flex flex-col items-center justify-center'>
        <div className='h-12 w-12 rounded-full border-4 border-cyan-400 border-t-transparent animate-spin' />
        <span className='mt-4 text-base font-medium text-slate-100'>Chargement...</span>
      </div>
    );
  }



  return (
    <div className='min-h-screen bg-slate-950 text-white'>
      <header className='mx-auto flex max-w-7xl items-center justify-between px-6 py-6'>
        <div className='flex items-center gap-4'>
          <img src={logo} alt='Ventec logo' className='h-9 md:h-12 w-auto rounded-lg object-cover border border-white/20 shadow-lg' />
          <div>
            <p className='hidden md:block text-sm uppercase tracking-[0.3em] text-cyan-300'>Ventec RH</p>
            <h1 className='hidden md:block text-xl font-semibold'>Solution de gestion RH</h1>
          </div>
        </div>

        <nav className=' items-center gap-6 flex'>
          <Link to='/signin' className='rounded-full bg-cyan-500 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/30 hover:bg-cyan-400'>Connexion</Link>
        </nav>
      </header>

      <main className='relative overflow-hidden'>
        <div className='absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.22),_transparent_55%)]' />
        <div className='mx-auto max-w-7xl px-6 py-20 lg:px-8'>
          <div className='grid gap-12 lg:grid-cols-2 lg:items-center'>
            <div className='relative z-10'>
              <p className='mb-4 inline-flex rounded-full bg-cyan-500/15 px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200'>Gestion RH moderne</p>
              <h2 className='text-4xl font-extrabold tracking-tight text-white sm:text-5xl'>Digitalisez vos processus RH avec une interface simple et professionnelle.</h2>
              <p className='mt-6 max-w-xl text-slate-300'>Suivi des employés, gestion des congés, évaluations, et tableaux de bord en temps réel pour une entreprise plus agile.</p>

              <div className='mt-10 flex flex-wrap gap-4'>
                <Link to='/signup' className='rounded-full bg-white px-7 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-black/15 transition hover:bg-slate-100'>Créer un compte</Link>
                <Link to='/signin' className='rounded-full border border-white/20 bg-white/5 px-7 py-3 text-sm font-semibold text-white transition hover:bg-white/10'>Se connecter</Link>
              </div>
            </div>

            <div className='relative z-10 flex justify-center'>
              <div className='relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/80 shadow-2xl shadow-black/30'>
                <div className='p-8 sm:p-10'>
                  <p className='text-sm uppercase tracking-[0.2em] text-cyan-300'>Tableau de bord RH</p>
                  <h3 className='mt-4 text-3xl font-semibold text-white'>Pilotage centralisé des ressources humaines</h3>
                  <div className='mt-8 grid gap-4 sm:grid-cols-2'>
                    <div className='rounded-3xl bg-white/5 p-5'>
                      <p className='text-sm text-slate-400'>Employés</p>
                      <p className='mt-3 text-2xl font-semibold text-white'>128</p>
                    </div>
                    <div className='rounded-3xl bg-white/5 p-5'>
                      <p className='text-sm text-slate-400'>Demandes de congés</p>
                      <p className='mt-3 text-2xl font-semibold text-white'>24</p>
                    </div>
                  </div>
                  <div className='mt-8 rounded-3xl bg-slate-950/60 p-5'>
                    <p className='text-sm uppercase tracking-[0.2em] text-slate-400'>Dernière activité</p>
                    <ul className='mt-4 space-y-3 text-sm text-slate-300'>
                      <li>Validation de mission récente</li>
                      <li>Mise à jour des fiches salariés</li>
                      <li>Préparation des entretiens annuels</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <section id='services' className='border-t border-white/10 bg-slate-950/90 py-20'>
        <div className='mx-auto max-w-6xl px-6'>
          <div className='grid gap-8 lg:grid-cols-3'>
            <div className='rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/10'>
              <p className='text-xl font-semibold text-white'>Gestion des talents</p>
              <p className='mt-4 text-slate-300'>Recrutement, onboarding et suivi des compétences dans un seul espace sécurisé.</p>
            </div>
            <div className='rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/10'>
              <p className='text-xl font-semibold text-white'>Gestion des présences</p>
              <p className='mt-4 text-slate-300'>Planification des équipes, contrôle des absences et suivi des temps en temps réel.</p>
            </div>
            <div className='rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/10'>
              <p className='text-xl font-semibold text-white'>Tableaux de bord</p>
              <p className='mt-4 text-slate-300'>Indicateurs clés, performances et rapports RH présentés clairement pour une prise de décision rapide.</p>
            </div>
          </div>
        </div>
      </section>

      
      

      <footer id='contact' className='border-t border-white/10 bg-slate-950/90 py-10'>
        <div className='mx-auto flex max-w-6xl flex-col gap-6 px-6 text-slate-400 sm:flex-row sm:items-center sm:justify-between'>
          <p>Projet RH Ventec © 2026</p>
          <div className='flex flex-wrap gap-4'>
            <Link to='/signin' className='text-sm text-slate-200 hover:text-white'>Connexion</Link>
            <Link to='/signup' className='text-sm text-slate-200 hover:text-white'>Inscription</Link>
            <a href='https://www.ventec.ma/fr/' target='_blank' rel='noreferrer' className='text-sm text-cyan-300 hover:text-cyan-200'>Site officiel</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

