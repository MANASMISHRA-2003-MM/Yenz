import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';

// Vendor App Pages
import { VendorDashboard, VendorOnboarding, VendorOrderHistory, VendorSettings } from './modules/vendor';

// Auth Pages
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));

const PageFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-emerald-600 animate-spin" aria-label="Loading" />
  </div>
);

// Protected Route Wrapper for Authenticated Vendor Pages
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageFallback />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" richColors closeButton />
      <Router>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Vendor Core Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <VendorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vendor/dashboard"
              element={
                <ProtectedRoute>
                  <VendorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vendor/onboarding"
              element={
                <ProtectedRoute>
                  <VendorOnboarding />
                </ProtectedRoute>
              }
            />

            {/* Vendor Orders & History */}
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <VendorOrderHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vendor/orders"
              element={
                <ProtectedRoute>
                  <VendorOrderHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <VendorOrderHistory />
                </ProtectedRoute>
              }
            />

            {/* Vendor Store Profile & Network Settings */}
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <VendorSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <VendorSettings />
                </ProtectedRoute>
              }
            />

            {/* Fallback to Vendor Dashboard */}
            <Route path="*" element={<Navigate to="/vendor/dashboard" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}
