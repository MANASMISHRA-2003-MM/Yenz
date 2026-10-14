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
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));

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

// Application Error Boundary to prevent blank white screen crashes
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('DeliveryApp ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center text-3xl mb-4 shadow-sm">
            🛵
          </div>
          <h2 className="text-xl font-black text-slate-900">Something went wrong</h2>
          <p className="text-xs text-slate-500 max-w-sm mt-1 font-medium">
            The delivery cockpit encountered an unexpected error.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.href = '/delivery/dashboard';
            }}
            className="mt-5 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-sm transition active:scale-95"
          >
            Reload Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Toaster position="top-center" richColors closeButton />
        <Router>
          <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

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
            <Route
              path="/orders"
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
  </ErrorBoundary>
);
}
