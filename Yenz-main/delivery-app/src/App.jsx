import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';

// Delivery App Pages
import {
  DeliveryDashboard,
  ActiveTrip,
  DeliveryOnboarding,
  DeliveryHistory,
  DeliverySettings
} from './modules/rider';

// Auth Pages
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));

const PageFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-cyan-600 animate-spin" aria-label="Loading" />
  </div>
);

// Protected Route Wrapper for Authenticated Delivery Partner Pages
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

            {/* Delivery Core Dashboard */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DeliveryDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/delivery/dashboard"
              element={
                <ProtectedRoute>
                  <DeliveryDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DeliveryDashboard />
                </ProtectedRoute>
              }
            />

            {/* Active Live Trip with GPS, Map, OTP & Camera Verification */}
            <Route
              path="/delivery/active-trip"
              element={
                <ProtectedRoute>
                  <ActiveTrip />
                </ProtectedRoute>
              }
            />
            <Route
              path="/delivery/active-trip/:deliveryId"
              element={
                <ProtectedRoute>
                  <ActiveTrip />
                </ProtectedRoute>
              }
            />
            <Route
              path="/active-trip"
              element={
                <ProtectedRoute>
                  <ActiveTrip />
                </ProtectedRoute>
              }
            />
            <Route
              path="/active-trip/:deliveryId"
              element={
                <ProtectedRoute>
                  <ActiveTrip />
                </ProtectedRoute>
              }
            />

            {/* Delivery Onboarding & Document Verification */}
            <Route
              path="/delivery/onboarding"
              element={
                <ProtectedRoute>
                  <DeliveryOnboarding />
                </ProtectedRoute>
              }
            />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <DeliveryOnboarding />
                </ProtectedRoute>
              }
            />

            {/* Past Deliveries & Earnings History */}
            <Route
              path="/delivery/history"
              element={
                <ProtectedRoute>
                  <DeliveryHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <DeliveryHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/trips"
              element={
                <ProtectedRoute>
                  <DeliveryHistory />
                </ProtectedRoute>
              }
            />

            {/* Rider Profile, Hardware Audio & Network Settings */}
            <Route
              path="/delivery/settings"
              element={
                <ProtectedRoute>
                  <DeliverySettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <DeliverySettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <DeliverySettings />
                </ProtectedRoute>
              }
            />

            {/* Fallback to Delivery Dashboard */}
            <Route path="*" element={<Navigate to="/delivery/dashboard" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}
