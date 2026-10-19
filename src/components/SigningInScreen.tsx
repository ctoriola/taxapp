import React from 'react';

// Shown while a returning Google sign-in completes, instead of flashing the empty form
export default function SigningInScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-canvas px-4">
      <div className="text-center" role="status">
        <div className="w-12 h-12 border-4 border-brand-line border-t-brand-forest rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-brand-ink font-medium">Signing you in with Google…</p>
      </div>
    </div>
  );
}
