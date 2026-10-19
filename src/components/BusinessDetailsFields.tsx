import React from 'react';
import { Building2, Phone, MapPin, Upload, X } from 'lucide-react';

export interface BusinessDetailsValues {
  businessName: string;
  businessType: string;
  phone: string;
  location: string;
}

interface BusinessDetailsFieldsProps {
  values: BusinessDetailsValues;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  logoPreview: string;
  onLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveLogo: () => void;
}

// Business name, type, phone, location and logo, shared by signup and profile completion
export default function BusinessDetailsFields({
  values,
  onChange,
  logoPreview,
  onLogoChange,
  onRemoveLogo,
}: BusinessDetailsFieldsProps) {
  return (
    <>
      {/* Business Name */}
      <div>
        <label className="field-label">Business Name</label>
        <div className="relative">
          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted pointer-events-none" />
          <input
            type="text"
            name="businessName"
            value={values.businessName}
            onChange={onChange}
            placeholder="Your company name"
            className="input-field pl-12"
          />
        </div>
      </div>

      {/* Business Type */}
      <div>
        <label className="field-label">Business Type</label>
        <select
          name="businessType"
          value={values.businessType}
          onChange={onChange}
          className="input-field"
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
        <label className="field-label">Phone Number</label>
        <div className="relative">
          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted pointer-events-none" />
          <input
            type="tel"
            name="phone"
            value={values.phone}
            onChange={onChange}
            placeholder="+234 8XX XXX XXXX"
            className="input-field pl-12"
          />
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="field-label">Location</label>
        <div className="relative">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted pointer-events-none" />
          <input
            type="text"
            name="location"
            value={values.location}
            onChange={onChange}
            placeholder="City/Region"
            className="input-field pl-12"
          />
        </div>
      </div>

      {/* Company Logo */}
      <div>
        <label className="field-label">Company Logo (Optional)</label>
        {logoPreview ? (
          <div className="relative w-max">
            <img
              src={logoPreview}
              alt="Logo preview"
              className="w-24 h-24 object-contain bg-brand-canvas rounded-2xl p-2"
            />
            <button
              type="button"
              onClick={onRemoveLogo}
              aria-label="Remove logo"
              className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white border border-brand-line text-brand-down flex items-center justify-center hover:bg-brand-down/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label className="block">
            <input
              type="file"
              accept="image/*"
              onChange={onLogoChange}
              className="hidden"
            />
            <div className="border-2 border-dashed border-brand-line rounded-2xl p-6 text-center cursor-pointer hover:bg-brand-canvas/60 transition-colors">
              <Upload className="w-6 h-6 text-brand-muted mx-auto mb-2" />
              <p className="text-sm text-brand-ink">Click to upload your company logo</p>
              <p className="text-xs text-brand-muted mt-1">PNG, JPG up to 500 KB</p>
            </div>
          </label>
        )}
      </div>
    </>
  );
}
