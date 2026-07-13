import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignInButton, useAuth } from '@clerk/clerk-react';

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
    <div className='bg-gradient-to-r from-blue-300 to-red-200 h-screen'>
      <div>
        <h1 className='text-center h-20 text-2xl font-bold'>Hello everyone</h1>
      </div>

      <div className='text-center'>
        <SignInButton forceRedirectUrl="/home" signUpForceRedirectUrl="/home">
          <button className='bg-red-500 rounded-lg px-5 py-1 border-gray-300 text-white shadow-sm hover:shadow-lg hover:bg-red-400'>
            Sign in / Sign up
          </button>
        </SignInButton>
      </div>
    </div>
  );
};

