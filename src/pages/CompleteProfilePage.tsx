import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AlertCircle, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { saveUserProfile, uploadCompanyLogo } from '../services/customerService';
import BusinessDetailsFields from '../components/BusinessDetailsFields';

// Shown after a first-time Google sign-in, which skips the signup form's business step
export default function CompleteProfilePage() {
  const { user, profile, isLoading: authLoading, refreshProfile, signOut } = useAuth();
  const [formData, setFormData] = useState({
    fullName: user?.displayName || '',
    businessName: '',
    businessType: '',
    phone: '',
    location: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.fullName || !formData.businessName || !formData.businessType || !formData.phone || !formData.location) {
      setError('Please fill in all business information');
      return;
    }

    if (formData.phone.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setIsSaving(true);
    try {
      const logoUrl = logoFile ? await uploadCompanyLogo(logoFile) : '';

      await saveUserProfile({
        email: user.email,
        full_name: formData.fullName,
        business_name: formData.businessName,
        business_type: formData.businessType,
        phone: formData.phone,
        location: formData.location,
        logo_url: logoUrl || undefined,
      }, user.id);

      await refreshProfile();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save your business details');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">VATClear</h1>
          <p className="text-slate-900 font-semibold">Tell us about your business</p>
          <p className="text-sm text-slate-600 mt-1">Signed in as {user.email}. This appears on your invoices.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Your full name"
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <BusinessDetailsFields
            values={formData}
            onChange={handleChange}
            logoPreview={logoPreview}
            onLogoChange={handleLogoChange}
            onRemoveLogo={removeLogo}
          />

          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Saving...' : 'Continue to Dashboard'}
          </button>
        </form>

        <p className="text-center text-slate-600 text-sm mt-6">
          Wrong account?{' '}
          <button type="button" onClick={handleSignOut} className="text-blue-600 hover:underline font-medium">
            Sign out
          </button>
        </p>
      </div>
    </div>
  );
}
