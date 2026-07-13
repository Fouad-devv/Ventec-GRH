import { SignIn } from '@clerk/clerk-react';

export const ResetPasswordPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl p-6 sm:p-10">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Reset your password</h1>
        <p className="text-slate-600 mb-6">
          Enter your email address and follow the instructions sent to your inbox.
        </p>
        <SignIn signUpUrl="/signup" forceRedirectUrl="/home" routing="path" path="/signin" />
      </div>
    </div>
  );
};
