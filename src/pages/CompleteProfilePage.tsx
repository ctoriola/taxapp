import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AlertCircle, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { saveUserProfile, uploadCompanyLogo } from '../services/customerService';
import BusinessDetailsFields from '../components/BusinessDetailsFields';
import AuthLayout from '../components/AuthLayout';

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
      <div className="min-h-screen flex items-center justify-center bg-brand-canvas">
        <div className="w-12 h-12 border-4 border-brand-line border-t-brand-forest rounded-full animate-spin"></div>
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
    await signOut('/login');
  };

  return (
    <AuthLayout title="Tell us about your business" subtitle={<>Signed in as {user.email}. This appears on your invoices.</>}>

        {error && (
          <div className="rounded-2xl border border-brand-down/20 bg-brand-down/5 p-4 mb-6 flex gap-3">
            <AlertCircle className="w-5 h-5 text-brand-down flex-shrink-0 mt-0.5" />
            <p className="text-sm text-brand-down">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="field-label">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted" />
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Your full name"
                className="input-field pl-12 bg-white"
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
            className="btn-primary w-full h-12"
          >
            {isSaving ? 'Saving...' : 'Continue to Dashboard'}
          </button>
        </form>

        <p className="text-center text-brand-muted text-sm mt-6">
          Accountant reviewing a client's records?{' '}
          <Link to="/clients" className="font-semibold text-brand-forest hover:underline">Go to your clients</Link>
        </p>
        <p className="text-center text-brand-muted text-sm mt-2">
          Wrong account?{' '}
          <button type="button" onClick={handleSignOut} className="font-semibold text-brand-forest hover:underline">
            Sign out
          </button>
        </p>
    </AuthLayout>
  );
}
