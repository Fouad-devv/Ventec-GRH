import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';

export const LandingPage = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate('/home', { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded) {
    return <div className='bg-gradient-to-r from-blue-300 to-red-200 h-screen flex items-center justify-center'>Loading...</div>;
  }

  return (
    <div className='bg-gradient-to-r from-blue-300 to-red-200 min-h-screen flex flex-col items-center justify-center px-4'>
      <div className='max-w-2xl text-center bg-white/70 rounded-3xl p-8 shadow-xl'>
        <h1 className='text-4xl font-bold mb-4'>Hello everyone</h1>
        <p className='text-lg text-slate-700 mb-8'>Access your account, create one quickly, or reset your password from one place.</p>

        <div className='flex flex-wrap justify-center gap-4'>
          <Link to='/signin' className='bg-red-500 rounded-lg px-5 py-2 text-white shadow-sm hover:shadow-lg hover:bg-red-400'>
            Sign in
          </Link>
          <Link to='/signup' className='bg-slate-900 rounded-lg px-5 py-2 text-white shadow-sm hover:shadow-lg'>
            Sign up
          </Link>
          <Link to='/reset-password' className='border border-slate-700 rounded-lg px-5 py-2 text-slate-800 hover:bg-slate-100'>
            Reset password
          </Link>
        </div>
      </div>
    </div>
  );
};

