import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Save, AlertCircle, CheckCircle, Loader, Upload, X as XIcon, User, Building2, ImageIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile, fetchUserProfile, UserProfile, uploadCompanyLogo } from '../services/customerService';
import PageHeader from '../components/PageHeader';
import { PanelTitle } from '../components/dashboard/ui';
import LetterheadSettings from '../components/LetterheadSettings';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { profile, user, refreshProfile } = useAuth();
  const [formData, setFormData] = useState<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'> | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Once the user starts editing, live profile updates (e.g. the server copy arriving after the
  // cached one) must not overwrite what they've typed
  const isEditing = useRef(false);

  useEffect(() => {
    if (isEditing.current) return;
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
            tax_id: profile.tax_id,
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
              tax_id: fetchedProfile.tax_id,
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
    isEditing.current = true;
    const { name, value } = e.target;
    if (formData) {
      setFormData((prev) => ({
        ...prev!,
        [name]: value,
      }));
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    isEditing.current = true;
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
    isEditing.current = true;
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
      isEditing.current = false;
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
      <div className="flex flex-col items-center justify-center py-24" role="status">
        <div className="w-10 h-10 border-4 border-brand-line border-t-brand-forest rounded-full animate-spin mb-4"></div>
        <p className="text-brand-muted">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Settings" description="Your account and the business details shown on your invoices" />

      {error && (
        <div role="alert" className="bg-brand-down/5 border border-brand-down/20 rounded-2xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-brand-down flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-brand-ink">Error</p>
            <p className="text-sm text-brand-down">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div role="status" className="bg-brand-lime/40 rounded-2xl p-4 flex gap-3">
          <CheckCircle className="w-5 h-5 text-brand-forest flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-brand-ink">Success!</p>
            <p className="text-sm text-brand-forest">Your profile has been updated</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Account */}
        <section className="card p-5 sm:p-6">
          <PanelTitle icon={<User className="w-[18px] h-[18px]" />} title="Account" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="field-label">Email Address</label>
              <input
                type="email"
                value={formData?.email || ''}
                disabled
                className="w-full px-4 py-3 rounded-2xl border border-brand-line bg-brand-canvas text-brand-muted cursor-not-allowed"
              />
              <p className="text-xs text-brand-muted mt-1">Email cannot be changed</p>
            </div>
            <div>
              <label className="field-label">Full Name</label>
              <input
                type="text"
                name="full_name"
                value={formData?.full_name || ''}
                onChange={handleChange}
                placeholder="Your full name"
                className="input-field"
              />
            </div>
          </div>
        </section>

        {/* Business */}
        <section className="card p-5 sm:p-6">
          <PanelTitle icon={<Building2 className="w-[18px] h-[18px]" />} title="Business" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="field-label">Business Name</label>
              <input
                type="text"
                name="business_name"
                value={formData?.business_name || ''}
                onChange={handleChange}
                placeholder="Your company name"
                className="input-field"
              />
            </div>
            <div>
              <label className="field-label">Business Type</label>
              <select name="business_type" value={formData?.business_type || ''} onChange={handleChange} className="input-field">
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
            <div>
              <label className="field-label">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData?.phone || ''}
                onChange={handleChange}
                placeholder="+234 8XX XXX XXXX"
                className="input-field"
              />
            </div>
            <div>
              <label className="field-label">Location</label>
              <input
                type="text"
                name="location"
                value={formData?.location || ''}
                onChange={handleChange}
                placeholder="City/Region"
                className="input-field"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="field-label">Tax Identification Number (TIN)</label>
              <input
                type="text"
                name="tax_id"
                value={formData?.tax_id || ''}
                onChange={handleChange}
                placeholder="e.g. 12345678-0001"
                className="input-field"
              />
              <p className="text-xs text-brand-muted mt-1">Optional. Shown on your invoices; VAT invoices should carry your TIN.</p>
            </div>
          </div>
        </section>

        {/* Logo */}
        <section className="card p-5 sm:p-6">
          <PanelTitle icon={<ImageIcon className="w-[18px] h-[18px]" />} title="Company Logo" />
          {logoPreview ? (
            <div className="relative w-max">
              <img src={logoPreview} alt="Logo preview" className="w-28 h-28 object-contain bg-brand-canvas rounded-2xl p-3" />
              <button
                type="button"
                onClick={removeLogo}
                aria-label="Remove logo"
                className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white border border-brand-line text-brand-down flex items-center justify-center hover:bg-brand-down/5"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="block">
              <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
              <div className="border-2 border-dashed border-brand-line rounded-2xl p-6 text-center cursor-pointer hover:bg-brand-canvas/60 transition-colors">
                <span className="w-11 h-11 rounded-full bg-brand-lime/50 text-brand-forest flex items-center justify-center mx-auto mb-2">
                  <Upload className="w-5 h-5" />
                </span>
                <p className="text-sm text-brand-ink">Click to upload company logo</p>
                <p className="text-xs text-brand-muted mt-1">PNG, JPG up to 500 KB (Optional)</p>
              </div>
            </label>
          )}
        </section>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button type="button" onClick={() => navigate('/dashboard')} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={isSaving} className="btn-primary">
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

      <LetterheadSettings />

      <div className="rounded-[28px] bg-brand-lime/30 p-5 sm:p-6">
        <h3 className="font-semibold text-brand-ink mb-1">Profile Information</h3>
        <p className="text-sm text-brand-ink/80">
          Update your business details here. Your email address cannot be changed. To change your password,{' '}
          <Link to="/forgot-password" className="font-semibold text-brand-forest underline">send yourself a reset link</Link>.
        </p>
      </div>
    </div>
  );
}
