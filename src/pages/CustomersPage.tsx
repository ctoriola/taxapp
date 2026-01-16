import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Trash2, Mail, Phone, Building2, ArrowUpRight, Menu, X, LogOut, Settings, Bell, Home } from 'lucide-react';
import { useCustomers } from '../context/CustomersContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function CustomersPage() {
  const navigate = useNavigate();
  const { customers, deleteCustomer, refreshCustomers, isLoading, error } = useCustomers();
  const { user, profile, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
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
    refreshCustomers();
  }, [refreshCustomers]);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    
    const query = searchQuery.toLowerCase();
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(query) ||
        customer.email.toLowerCase().includes(query) ||
        customer.phone.includes(query) ||
        customer.tax_id?.toLowerCase().includes(query)
    );
  }, [customers, searchQuery]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await deleteCustomer(id);
      } catch (err) {
        console.error('Delete failed:', err);
      }
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

      <main className="px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-emerald-900">Customers</h1>
            <p className="text-sm text-slate-600 mt-1">Manage and track your customers</p>
          </div>
          <Link
            to="/customers/add"
            className="btn-primary flex items-center gap-2 rounded-2xl"
          >
            <Plus className="w-5 h-5" />
            Add Customer
          </Link>
        </div>
        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && customers.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-stone-300 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-stone-600">Loading customers...</p>
          </div>
        ) : (
          <>
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-3 w-5 h-5 text-stone-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone, or tax ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field w-full pl-12"
            />
          </div>
        </div>

        {/* Results Info */}
        <div className="mb-6">
          <p className="text-sm text-stone-600">
            {filteredCustomers.length} of {customers.length} customer{customers.length !== 1 ? 's' : ''}
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
        </div>

        {/* Customers Grid */}
        {filteredCustomers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCustomers.map((customer) => (
              <div key={customer.id} className="card-bento p-6 bg-gradient-to-br from-emerald-50 to-white hover:shadow-lg transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900">{customer.name}</h3>
                  </div>
                  <button
                    onClick={() => handleDelete(customer.id)}
                    className="p-2 hover:bg-red-50 rounded-xl transition-colors"
                    title="Delete customer"
                  >
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </button>
                </div>

                {/* Contact Details */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <a
                      href={`mailto:${customer.email}`}
                      className="text-emerald-600 hover:text-emerald-700 truncate font-medium"
                    >
                      {customer.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <a
                      href={`tel:${customer.phone}`}
                      className="text-stone-700 hover:text-stone-900"
                    >
                      {customer.phone}
                    </a>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-stone-200/50">
                  <p className="text-xs text-stone-400">Added {customer.created_at}</p>
                </div>

                {/* Action Button */}
                <Link
                  to={`/customers/${customer.id}`}
                  className="flex items-center gap-2 mt-4 w-full py-2 px-3 btn-secondary rounded-xl transition-all text-center justify-center"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  View Details
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="card-bento p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-xl mb-4">
              <Building2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {customers.length === 0 ? 'No Customers Yet' : 'No Matching Customers'}
            </h3>
            <p className="text-stone-600 mb-6">
              {customers.length === 0
                ? 'Add your first customer to get started.'
                : 'Try adjusting your search criteria.'}
            </p>
            {customers.length === 0 && (
              <Link
                to="/customers/add"
                className="inline-block px-6 py-2 btn-primary rounded-2xl transition-all"
              >
                Add First Customer
              </Link>
            )}
          </div>
        )}
        </>
        )}
      </main>
    </div>
  );
}
