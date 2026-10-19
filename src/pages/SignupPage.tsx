import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, User } from 'lucide-react';
import BusinessDetailsFields from '../components/BusinessDetailsFields';
import GoogleSignInButton from '../components/GoogleSignInButton';
import AuthLayout from '../components/AuthLayout';
import SigningInScreen from '../components/SigningInScreen';
import { useAuth } from '../context/AuthContext';
import { saveUserProfile, uploadCompanyLogo } from '../services/customerService';
import { signUp as authSignUp } from '../services/authService';

export default function SignupPage() {
  const [step, setStep] = useState(1); // Step 1: Account, Step 2: Business Info
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    businessName: '',
    businessType: '',
    phone: '',
    location: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user, profile, isLoading: authLoading, refreshProfile, isCompletingGoogleSignIn } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
  };

  const validateStep1 = () => {
    if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields');
      return false;
    }

    if (formData.email.length < 5 || !formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const validateStep2 = () => {
    if (!formData.fullName || !formData.businessName || !formData.businessType || !formData.phone || !formData.location) {
      setError('Please fill in all business information');
      return false;
    }

    if (formData.phone.length < 10) {
      setError('Please enter a valid phone number');
      return false;
    }

    return true;
  };

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateStep1()) {
      return;
    }

    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!validateStep2()) {
      return;
    }

    setIsLoading(true);
    try {
      // Sign up with email and password
      const newUser = await authSignUp(formData.email, formData.password);
      
      // Upload logo if provided
      let logoUrl = '';
      if (logoFile) {
        logoUrl = await uploadCompanyLogo(logoFile);
      }

      // Save business profile data with the new user's ID
      await saveUserProfile({
        email: formData.email,
        full_name: formData.fullName,
        business_name: formData.businessName,
        business_type: formData.businessType,
        phone: formData.phone,
        location: formData.location,
        logo_url: logoUrl || undefined,
      }, newUser.id);

      // Load the new profile into the app before leaving, so protected pages see it
      await refreshProfile();
      
      setSuccess(true);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signup failed. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Already signed in (and not midway through creating this account)
  if (user && !authLoading && !isLoading && !success) {
    return <Navigate to={profile ? '/dashboard' : '/complete-profile'} replace />;
  }

  if (isCompletingGoogleSignIn) {
    return <SigningInScreen />;
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle={step === 1 ? 'Start with your login details.' : 'Now your business. This appears on your invoices.'}
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-forest hover:underline">
            Sign in here
          </Link>
        </>
      }
    >
        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-6" aria-label={`Step ${step} of 2`}>
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-muted">Step {step} of 2</span>
          <div className="flex-1 flex gap-1.5">
            <div className="flex-1 h-1.5 rounded-full bg-brand-forest"></div>
            <div className={`flex-1 h-1.5 rounded-full transition-colors ${step === 2 ? 'bg-brand-forest' : 'bg-brand-line'}`}></div>
          </div>
        </div>

        {/* Success State */}
        {success && (
          <div className="rounded-2xl border border-brand-lime-deep/40 bg-brand-lime/40 p-4 mb-6 flex gap-3">
            <CheckCircle className="w-5 h-5 text-brand-forest flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-brand-forest">Account created successfully!</p>
              <p className="text-sm text-brand-forest/80">Redirecting to dashboard...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-2xl border border-brand-down/20 bg-brand-down/5 p-4 mb-6 flex gap-3">
            <AlertCircle className="w-5 h-5 text-brand-down flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-brand-down">Error</p>
              <p className="text-sm text-brand-down">{error}</p>
            </div>
          </div>
        )}

        {/* Step 1: Account Information */}
        {step === 1 && (
          <form onSubmit={handleNext} className="space-y-4">
            {/* Full Name */}
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

            {/* Email */}
            <div>
              <label className="field-label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@company.com"
                  className="input-field pl-12 bg-white"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="field-label">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="At least 8 characters"
                  className="input-field pl-12 pr-12 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-ink"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="field-label">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  className="input-field pl-12 pr-12 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-ink"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Next Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full h-12"
            >
              {isLoading ? 'Processing...' : 'Next'}
            </button>
          </form>
        )}

        {step === 1 && (
          <>
            <div className="my-6 flex items-center">
              <div className="flex-1 h-px bg-brand-line"></div>
              <span className="px-4 text-sm text-brand-muted">or</span>
              <div className="flex-1 h-px bg-brand-line"></div>
            </div>
            <GoogleSignInButton onError={setError} disabled={isLoading} />
          </>
        )}

        {/* Step 2: Business Information */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <BusinessDetailsFields
              values={formData}
              onChange={handleChange}
              logoPreview={logoPreview}
              onLogoChange={handleLogoChange}
              onRemoveLogo={removeLogo}
            />

            {/* Form Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setError('');
                }}
                className="btn-secondary flex-1 h-12"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary flex-1 h-12"
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
          </form>
        )}

    </AuthLayout>
  );
}
