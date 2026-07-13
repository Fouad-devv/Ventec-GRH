import { SignIn, SignUp, SignInButton, SignUpButton, useAuth } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const AuthPage = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const mode = location.pathname.includes('/signup') ? 'signup' : 'signin';

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate('/home', { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl rounded-3xl bg-white/90 shadow-2xl overflow-hidden flex flex-col lg:flex-row">
        <div className="lg:w-2/5 bg-slate-900 text-white p-8 flex flex-col justify-center">
          <h1 className="text-3xl font-bold mb-4">Welcome to Ventec</h1>
          <p className="text-slate-300 mb-6">
            Sign in to manage your workspace or create a new account in seconds.
          </p>
          <div className="space-y-3">
            <div className="text-sm text-slate-400">Quick access</div>
            <div className="flex gap-3">
              <SignInButton mode="modal">
                <button className="px-4 py-2 rounded-lg bg-white text-slate-900 font-semibold hover:bg-slate-100">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="px-4 py-2 rounded-lg border border-slate-400 text-white font-semibold hover:bg-slate-800">
                  Sign up
                </button>
              </SignUpButton>
            </div>
          </div>
        </div>

        <div className="lg:w-3/5 p-6 sm:p-10 flex items-center justify-center">
          {mode === 'signup' ? (
            <SignUp signInUrl="/signin" forceRedirectUrl="/home" routing="path" path="/signup" />
          ) : (
            <SignIn signUpUrl="/signup" forceRedirectUrl="/home" routing="path" path="/signin" />
          )}
        </div>
      </div>
    </div>
  );
};
