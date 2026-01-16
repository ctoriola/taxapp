import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle, CheckCircle, Loader, Menu, X, LogOut, Settings as SettingsIcon, Bell, Search, Upload, X as XIcon, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile, fetchUserProfile, UserProfile, uploadCompanyLogo } from '../services/customerService';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { profile, user, refreshProfile, signOut } = useAuth();
  const [formData, setFormData] = useState<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'> | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  useEffect(() => {
    // Load profile data from context or fetch it
    const loadProfile = async () => {
      setIsLoading(true);
      try {
        if (profile) {
          setFormData({
            email: profile.email,
            full_name: profile.full_name,
            business_name: profile.business_name,
            business_type: profile.business_type,
            phone: profile.phone,
            location: profile.location,
            logo_url: profile.logo_url,
          });
          if (profile.logo_url) {
            setLogoPreview(profile.logo_url);
          }
        } else {
          // Try to fetch if not in context
          const fetchedProfile = await fetchUserProfile();
          if (fetchedProfile) {
            setFormData({
              email: fetchedProfile.email,
              full_name: fetchedProfile.full_name,
              business_name: fetchedProfile.business_name,
              business_type: fetchedProfile.business_type,
              phone: fetchedProfile.phone,
              location: fetchedProfile.location,
              logo_url: fetchedProfile.logo_url,
            });
            if (fetchedProfile.logo_url) {
              setLogoPreview(fetchedProfile.logo_url);
            }
          } else if (user?.email) {
            // Initialize with empty form if no profile exists yet
            setFormData({
              email: user.email,
              full_name: '',
              business_name: '',
              business_type: '',
              phone: '',
              location: '',
            });
          }
        }
      } catch (err) {
        console.error('Error loading profile:', err);
        setError('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [profile, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (formData) {
      setFormData((prev) => ({
        ...prev!,
        [name]: value,
      }));
    }
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
    if (formData) {
      setFormData((prev) => ({
        ...prev!,
        logo_url: undefined,
      }));
    }
  };

  const validateForm = () => {
    if (!formData) return false;

    if (!formData.full_name || !formData.business_name || !formData.business_type || !formData.phone || !formData.location) {
      setError('Please fill in all fields');
      return false;
    }

    if (formData.phone.length < 10) {
      setError('Please enter a valid phone number');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!validateForm() || !formData) {
      return;
    }

    setIsSaving(true);
    try {
      // Upload logo if a new file was selected
      if (logoFile) {
        const logoUrl = await uploadCompanyLogo(logoFile);
        formData.logo_url = logoUrl;
      }

      await updateUserProfile(formData);
      
      // Refresh profile in context
      await refreshProfile();
      
      setSuccess(true);
      setLogoFile(null); // Clear the file input after successful upload
      
      // Reset success message after 2 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save profile';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-stone-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Top Navigation */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-stone-200/50">
        <div className="flex items-center justify-between px-6 lg:px-8 py-4">
          {/* Left: Logo & Sidebar Toggle */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-stone-100 rounded-xl transition-all duration-200"
            >
              {sidebarOpen ? (
                <X className="w-6 h-6 text-slate-600" />
              ) : (
                <Menu className="w-6 h-6 text-slate-600" />
              )}
            </button>            <Link
              to="/dashboard"
              className="p-2.5 hover:bg-stone-100 rounded-xl transition-all duration-200"
              title="Dashboard"
            >
              <Home className="w-5 h-5 text-slate-600" />
            </Link>            <div className="hidden lg:flex items-center gap-3">
              {profile?.logo_url && (
                <img
                  src={profile.logo_url}
                  alt="Company logo"
                  className="h-8 w-auto"
                />
              )}
              <div>
                <h2 className="text-xl font-bold text-emerald-700">{profile?.business_name || 'Business'}</h2>
                <p className="text-xs text-slate-600 mt-1">Logged in as: {user?.email || 'User'}</p>
              </div>
            </div>
          </div>

          {/* Center: Search */}
          <div className="hidden lg:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                className="input-field pl-10 py-2.5"
              />
            </div>
          </div>

          {/* Right: Notifications & Profile */}
          <div className="flex items-center gap-4">
            <button className="p-2.5 hover:bg-stone-100 rounded-xl transition-all duration-200 relative">
              <Bell className="w-5 h-5 text-slate-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-600 rounded-full"></span>
            </button>

            {profile?.logo_url ? (
              <img
                src={profile.logo_url}
                alt="Company logo"
                className="h-10 w-10 rounded-full object-cover cursor-pointer hover:shadow-lg transition-all"
              />
            ) : (
              <div className="h-10 w-10 bg-gradient-to-br from-emerald-400 to-emerald-700 rounded-full flex items-center justify-center text-white font-bold text-sm cursor-pointer hover:shadow-lg transition-all">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}

            <button
              className="p-2.5 hover:bg-stone-100 rounded-xl transition-all duration-200"
              title="Settings"
            >
              <SettingsIcon className="w-5 h-5 text-slate-600" />
            </button>

            <button
              onClick={handleLogout}
              className="p-2.5 hover:bg-stone-100 rounded-xl transition-all duration-200"
              title="Logout"
            >
              <LogOut className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-6 lg:px-8 py-8">
        {/* Profile Update Card */}
        <div className="card-bento bg-white p-8 mb-6">
          <h2 className="text-xl font-bold text-emerald-900 mb-6">Update Profile</h2>

          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6 flex gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-emerald-900">Success!</p>
                <p className="text-sm text-emerald-700">Your profile has been updated</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email (Read-only) */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-700 mb-2 font-medium">Email Address</label>
              <input
                type="email"
                value={formData?.email || ''}
                disabled
                className="w-full px-4 py-2 border border-stone-200 rounded-2xl bg-stone-100 text-stone-600 cursor-not-allowed"
              />
              <p className="text-xs text-stone-500 mt-1">Email cannot be changed</p>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-700 mb-2 font-medium">Full Name</label>
              <input
                type="text"
                name="full_name"
                value={formData?.full_name || ''}
                onChange={handleChange}
                placeholder="Your full name"
                className="input-field w-full"
              />
            </div>

            {/* Business Name */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-700 mb-2 font-medium">Business Name</label>
              <input
                type="text"
                name="business_name"
                value={formData?.business_name || ''}
                onChange={handleChange}
                placeholder="Your company name"
                className="input-field w-full"
              />
            </div>

            {/* Business Type */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-700 mb-2 font-medium">Business Type</label>
              <select
                name="business_type"
                value={formData?.business_type || ''}
                onChange={handleChange}
                className="input-field w-full"
              >
                <option value="">Select a business type</option>
                <option value="retail">Retail</option>
                <option value="services">Services</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="technology">Technology</option>
                <option value="food_beverage">Food & Beverage</option>
                <option value="healthcare">Healthcare</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-700 mb-2 font-medium">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData?.phone || ''}
                onChange={handleChange}
                placeholder="+234 8XX XXX XXXX"
                className="input-field w-full"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-700 mb-2 font-medium">Location</label>
              <input
                type="text"
                name="location"
                value={formData?.location || ''}
                onChange={handleChange}
                placeholder="City/Region"
                className="input-field w-full"
              />
            </div>

            {/* Company Logo */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-700 mb-2 font-medium">Company Logo</label>
              {logoPreview ? (
                <div className="relative">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-24 h-24 object-contain bg-stone-50 border border-stone-200 rounded-lg p-2"
                  />
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <div className="border-2 border-dashed border-stone-300 rounded-2xl p-6 text-center cursor-pointer hover:bg-stone-50 transition-colors">
                    <Upload className="w-6 h-6 text-stone-400 mx-auto mb-2" />
                    <p className="text-sm text-stone-600">Click to upload company logo</p>
                    <p className="text-xs text-stone-500 mt-1">PNG, JPG up to 5MB (Optional)</p>
                  </div>
                </label>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex-1 btn-secondary rounded-2xl py-2 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 btn-primary rounded-2xl py-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Info Section */}
        <div className="card-bento bg-emerald-50 border border-emerald-200/50 p-6">
          <h3 className="font-medium text-emerald-900 mb-2">Profile Information</h3>
          <p className="text-sm text-emerald-800">
            Update your business details here. Your email address cannot be changed. To change your email or password, please contact support.
          </p>
        </div>
      </main>
    </div>
  );
}
