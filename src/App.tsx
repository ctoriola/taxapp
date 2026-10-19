import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/AppShell';
import { startAnalytics } from './lib/analytics';

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
  RecurringInvoicesPage: () => import('./pages/RecurringInvoicesPage'),
  BankPage: () => import('./pages/BankPage'),
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
const RecurringInvoicesPage = lazy(pageLoaders.RecurringInvoicesPage);
const BankPage = lazy(pageLoaders.BankPage);
const CustomerDetailPage = lazy(pageLoaders.CustomerDetailPage);
const CreateExpensePage = lazy(pageLoaders.CreateExpensePage);
const ExpensesPage = lazy(pageLoaders.ExpensesPage);
const ExpenseDetailPage = lazy(pageLoaders.ExpenseDetailPage);
const ReportsPage = lazy(pageLoaders.ReportsPage);
// Admin console: not prefetched, since regular users never open it
const AdminPage = lazy(() => import('./pages/AdminPage'));

function PageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-canvas">
      <div className="w-10 h-10 border-4 border-brand-line border-t-brand-forest rounded-full animate-spin"></div>
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
  useEffect(() => startAnalytics(), []);

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
            {/* Signed-in pages share the header and tabs */}
            <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/customers/add" element={<AddCustomerPage />} />
              <Route path="/customers/:id" element={<CustomerDetailPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/invoices" element={<InvoicesPage />} />
              <Route path="/invoices/create" element={<CreateInvoicePage />} />
              <Route path="/invoices/recurring" element={<RecurringInvoicesPage />} />
              <Route path="/invoices/:id/edit" element={<EditInvoicePage />} />
              <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/expenses/create" element={<CreateExpensePage />} />
              <Route path="/expenses/:id" element={<ExpenseDetailPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/bank" element={<BankPage />} />
            </Route>
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <PrefetchPages />
          </Suspense>
        </Router>
      </DataProvider>
    </AuthProvider>
  );
}
