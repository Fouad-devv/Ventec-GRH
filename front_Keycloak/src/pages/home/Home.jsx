import { SignOutButton } from '@clerk/clerk-react';

export const Home = () => {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Home</h1>
          <SignOutButton redirectUrl="/">
            <button className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600">
              Logout
            </button>
          </SignOutButton>
        </div>
      </div>
    </div>
  );
};