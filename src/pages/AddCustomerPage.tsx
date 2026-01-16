import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, FileText, AlertCircle, Menu, X, LogOut, Settings, Bell, Search, Home } from 'lucide-react';
import { useCustomers } from '../context/CustomersContext';
import { useAuth } from '../context/AuthContext';

export default function AddCustomerPage() {
  const navigate = useNavigate();
  const { addCustomer, isLoading, customers } = useCustomers();
  const { user, profile, signOut } = useAuth();
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    tax_id: '',
  });

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.email || !formData.phone) {
      setError('Please fill in all required fields');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Check for duplicate email in existing customers
    const customerEmailExists = customers.some(
      (customer) => customer.email.toLowerCase() === formData.email.toLowerCase()
    );
    if (customerEmailExists) {
      setError('A customer with this email already exists');
      return;
    }

    try {
      await addCustomer({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        tax_id: formData.tax_id || null,
      });
      navigate('/customers');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add customer';
      setError(message);
    }
  };

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

            <Link
              to="/settings"
              className="p-2.5 hover:bg-stone-100 rounded-xl transition-all duration-200"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-slate-600" />
            </Link>

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
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-emerald-900">Add New Customer</h1>
        </div>
        <div className="card-bento p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Alert */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Contact Information */}
            <div>
              <h2 className="text-lg font-semibold text-emerald-900 mb-4">Contact Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div className="md:col-span-2">
                  <label htmlFor="name" className="block text-xs uppercase tracking-wider text-stone-700 mb-2 font-medium">
                    Name (Individual or Company)
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-3 w-5 h-5 text-stone-400" />
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe or Company Ltd"
                      className="input-field pl-12"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-xs uppercase tracking-wider text-stone-700 mb-2 font-medium">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3 w-5 h-5 text-stone-400" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="john@example.com"
                      className="input-field pl-12"
                      required
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="block text-xs uppercase tracking-wider text-stone-700 mb-2 font-medium">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-3 w-5 h-5 text-stone-400" />
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+234 801 234 5678"
                      className="input-field pl-12"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tax Information */}
            <div className="pt-6 border-t border-stone-200/50">
              <h2 className="text-lg font-semibold text-emerald-900 mb-4">Tax Information</h2>
              <div>
                <label htmlFor="tax_id" className="block text-xs uppercase tracking-wider text-stone-700 mb-2 font-medium">
                  Tax ID / BVN / CAC Number (Optional)
                </label>
                <div className="relative">
                  <FileText className="absolute left-4 top-3 w-5 h-5 text-stone-400" />
                  <input
                    id="tax_id"
                    name="tax_id"
                    type="text"
                    value={formData.tax_id}
                    onChange={handleChange}
                    placeholder="TID-000123"
                    className="input-field pl-12"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6 border-t border-stone-200/50">
              <button
                type="button"
                onClick={() => navigate('/customers')}
                className="btn-secondary flex-1 rounded-2xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary flex-1 rounded-2xl transition-all disabled:opacity-60"
              >
                {isLoading ? 'Adding...' : 'Add Customer'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
