import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';

// Every page except the landing and login screens is its own chunk, so the first visit only
// downloads what it shows. The rest are prefetched in the background once the current page is
// on screen (so they don't compete with it), which keeps later navigation instant.
// Listed roughly by how often people go there next.
const pageLoaders = {
  DashboardPage: () => import('./pages/DashboardPage'),
  InvoicesPage: () => import('./pages/InvoicesPage'),
  InvoiceDetailPage: () => import('./pages/InvoiceDetailPage'),
  CreateInvoicePage: () => import('./pages/CreateInvoicePage'),
  CustomersPage: () => import('./pages/CustomersPage'),
  ExpensesPage: () => import('./pages/ExpensesPage'),
  CreateExpensePage: () => import('./pages/CreateExpensePage'),
  ExpenseDetailPage: () => import('./pages/ExpenseDetailPage'),
  ReportsPage: () => import('./pages/ReportsPage'),
  CustomerDetailPage: () => import('./pages/CustomerDetailPage'),
  AddCustomerPage: () => import('./pages/AddCustomerPage'),
  EditInvoicePage: () => import('./pages/EditInvoicePage'),
  SettingsPage: () => import('./pages/SettingsPage'),
  SignupPage: () => import('./pages/SignupPage'),
  CompleteProfilePage: () => import('./pages/CompleteProfilePage'),
  ForgotPasswordPage: () => import('./pages/ForgotPasswordPage'),
  ResetPasswordPage: () => import('./pages/ResetPasswordPage'),
};

const SignupPage = lazy(pageLoaders.SignupPage);
const ForgotPasswordPage = lazy(pageLoaders.ForgotPasswordPage);
const ResetPasswordPage = lazy(pageLoaders.ResetPasswordPage);
const CompleteProfilePage = lazy(pageLoaders.CompleteProfilePage);
const DashboardPage = lazy(pageLoaders.DashboardPage);
const CustomersPage = lazy(pageLoaders.CustomersPage);
const AddCustomerPage = lazy(pageLoaders.AddCustomerPage);
const SettingsPage = lazy(pageLoaders.SettingsPage);
const CreateInvoicePage = lazy(pageLoaders.CreateInvoicePage);
const InvoicesPage = lazy(pageLoaders.InvoicesPage);
const InvoiceDetailPage = lazy(pageLoaders.InvoiceDetailPage);
const EditInvoicePage = lazy(pageLoaders.EditInvoicePage);
const CustomerDetailPage = lazy(pageLoaders.CustomerDetailPage);
const CreateExpensePage = lazy(pageLoaders.CreateExpensePage);
const ExpensesPage = lazy(pageLoaders.ExpensesPage);
const ExpenseDetailPage = lazy(pageLoaders.ExpenseDetailPage);
const ReportsPage = lazy(pageLoaders.ReportsPage);

function PageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
    </div>
  );
}

// Rendered inside the same Suspense boundary as the routes: React only runs this effect once
// the current page's chunk has loaded and rendered. The short pause lets that page start its
// own requests (data, images) before the prefetch begins.
let prefetchStarted = false;
function PrefetchPages() {
  useEffect(() => {
    if (prefetchStarted) return;
    const timer = window.setTimeout(() => {
      prefetchStarted = true;
      Object.values(pageLoaders).forEach((load) => load().catch(() => {}));
    }, 300);
    return () => window.clearTimeout(timer);
  }, []);
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Router>
          <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/complete-profile" element={<CompleteProfilePage />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
            <Route path="/customers/add" element={<ProtectedRoute><AddCustomerPage /></ProtectedRoute>} />
            <Route path="/customers/:id" element={<ProtectedRoute><CustomerDetailPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/invoices" element={<ProtectedRoute><InvoicesPage /></ProtectedRoute>} />
            <Route path="/invoices/create" element={<ProtectedRoute><CreateInvoicePage /></ProtectedRoute>} />
            <Route path="/invoices/:id/edit" element={<ProtectedRoute><EditInvoicePage /></ProtectedRoute>} />
            <Route path="/invoices/:id" element={<ProtectedRoute><InvoiceDetailPage /></ProtectedRoute>} />
            <Route path="/expenses" element={<ProtectedRoute><ExpensesPage /></ProtectedRoute>} />
            <Route path="/expenses/create" element={<ProtectedRoute><CreateExpensePage /></ProtectedRoute>} />
            <Route path="/expenses/:id" element={<ProtectedRoute><ExpenseDetailPage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <PrefetchPages />
          </Suspense>
        </Router>
      </DataProvider>
    </AuthProvider>
  );
}
