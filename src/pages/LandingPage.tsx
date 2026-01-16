import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, FileText, Lightbulb, TrendingUp, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Navbar */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
            VATClear
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="px-6 py-2 text-blue-600 font-medium hover:text-blue-700 transition-colors"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-6 py-2 text-blue-600 font-medium hover:text-blue-700 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <h1 className="text-6xl font-bold text-slate-900 mb-6 leading-tight">
          See Your VAT Before the Taxman Does
        </h1>
        <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed">
          Real-time VAT visibility, invoice tracking, and tax insights designed for Nigerian SMEs. Clarity on your finances, always.
        </p>
        <Link
          to="/signup"
          className="inline-block px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-200 text-lg"
        >
          Get Early Access
        </Link>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <h2 className="text-4xl font-bold text-slate-900 mb-16 text-center">Why Businesses Choose VATClear</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Feature 1 */}
          <div className="card p-8">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
              <Eye className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-3">Real-Time VAT Visibility</h3>
            <p className="text-slate-600">
              Track VAT received, paid, and payable instantly. Know exactly what you owe before the deadline hits.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="card p-8">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-6">
              <FileText className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-3">Invoice & Expense Tracking</h3>
            <p className="text-slate-600">
              Organize all your invoices and expenses in one place. Automatic categorization saves time.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="card p-8">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
              <Lightbulb className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-3">Smart Tax Insights</h3>
            <p className="text-slate-600">
              Get actionable recommendations on deductions, timing strategies, and tax compliance.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="card p-8">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-6">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-3">Financial Clarity</h3>
            <p className="text-slate-600">
              See revenue, expenses, profit, and VAT liability in beautiful, clear reports.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-emerald-600 text-white py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">Join Hundreds of Nigerian Businesses</h2>
          <p className="text-lg mb-10 text-blue-50">
            Start managing your VAT with confidence today. Early access is limited.
          </p>
          <Link
            to="/login"
            className="inline-block px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors duration-200 text-lg"
          >
            Get Early Access
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p>&copy; 2026 VATClear. Helping Nigerian SMEs master their finances.</p>
        </div>
      </footer>
    </div>
  );
}
