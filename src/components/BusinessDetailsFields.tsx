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
        <label className="block text-sm font-medium text-slate-700 mb-2">Business Name</label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            name="businessName"
            value={values.businessName}
            onChange={onChange}
            placeholder="Your company name"
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Business Type */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Business Type</label>
        <select
          name="businessType"
          value={values.businessType}
          onChange={onChange}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="tel"
            name="phone"
            value={values.phone}
            onChange={onChange}
            placeholder="+234 8XX XXX XXXX"
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            name="location"
            value={values.location}
            onChange={onChange}
            placeholder="City/Region"
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Company Logo */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Company Logo (Optional)</label>
        {logoPreview ? (
          <div className="relative">
            <img
              src={logoPreview}
              alt="Logo preview"
              className="w-24 h-24 object-contain bg-slate-50 border border-slate-300 rounded-lg p-2"
            />
            <button
              type="button"
              onClick={onRemoveLogo}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
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
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:bg-slate-50 transition-colors">
              <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600">Click to upload your company logo</p>
              <p className="text-xs text-slate-500 mt-1">PNG, JPG up to 500 KB</p>
            </div>
          </label>
        )}
      </div>
    </>
  );
}
