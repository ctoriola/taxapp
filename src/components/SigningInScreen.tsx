import React from 'react';

// Shown while a returning Google sign-in completes, instead of flashing the empty form
export default function SigningInScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center" role="status">
        <div className="w-12 h-12 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-700 font-medium">Signing you in with Google…</p>
      </div>
    </div>
  );
}
