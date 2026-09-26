import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ModeProvider } from './context/ModeContext';

// Eagerly loaded critical consumer pages
import Home from './pages/consumer/Home';

// Lazy loaded secondary & role-specific pages
const RestaurantDetail = lazy(() => import('./pages/consumer/RestaurantDetail'));
const CartPage = lazy(() => import('./pages/consumer/CartPage'));
const CheckoutPage = lazy(() => import('./pages/consumer/CheckoutPage'));
const OrderTracking = lazy(() => import('./pages/consumer/OrderTracking'));
const OrderHistory = lazy(() => import('./pages/consumer/OrderHistory'));
const SearchPage = lazy(() => import('./pages/consumer/SearchPage'));

const VendorDashboard = lazy(() => import('./pages/vendor/VendorDashboard'));
const VendorOnboarding = lazy(() => import('./pages/vendor/VendorOnboarding'));

const DeliveryDashboard = lazy(() => import('./pages/delivery/DeliveryDashboard'));
const DeliveryOnboarding = lazy(() => import('./pages/delivery/DeliveryOnboarding'));

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));

const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const Profile = lazy(() => import('./pages/consumer/Profile'));

const PageFallback = () => (
  <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
    <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

// Consumer Route Guard (Restricts Vendors, Drivers, Admin to their portals)
const ConsumerRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageFallback />;
  }

  if (user) {
    const role = (user.role || '').toUpperCase();
    if (role === 'VENDOR') return <Navigate to="/vendor/dashboard" replace />;
    if (role === 'DELIVERY_PARTNER') return <Navigate to="/delivery/dashboard" replace />;
    if (role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
};

// Protected Route Wrapper with RBAC for Unified Krawing System
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageFallback />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const normalizedUserRole = (user.role || 'customer').toUpperCase();
  const normalizedAllowed = allowedRoles.map(r => r.toUpperCase());

  if (allowedRoles && !normalizedAllowed.includes(normalizedUserRole)) {
    if (normalizedUserRole === 'VENDOR') return <Navigate to="/vendor/dashboard" replace />;
    if (normalizedUserRole === 'DELIVERY_PARTNER') return <Navigate to="/delivery/dashboard" replace />;
    if (normalizedUserRole === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/home" replace />;
  }

  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" richColors closeButton />
      <ModeProvider>
        <CartProvider>
          <Router>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                {/* Public / Auth */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Consumer Routes */}
                <Route path="/" element={<ConsumerRoute><Home /></ConsumerRoute>} />
                <Route path="/home" element={<ConsumerRoute><Home /></ConsumerRoute>} />
                <Route path="/search" element={<ConsumerRoute><SearchPage /></ConsumerRoute>} />
                <Route path="/restaurant/:id" element={<ConsumerRoute><RestaurantDetail /></ConsumerRoute>} />
                <Route path="/cart" element={<ConsumerRoute><CartPage /></ConsumerRoute>} />
                <Route
                  path="/checkout"
                  element={
                    <ProtectedRoute allowedRoles={['customer', 'consumer']}>
                      <CheckoutPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/checkout/cravings"
                  element={
                    <ProtectedRoute allowedRoles={['customer', 'consumer']}>
                      <CheckoutPage modeOverride="CRAVINGS" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/checkout/fresh-mandi"
                  element={
                    <ProtectedRoute allowedRoles={['customer', 'consumer']}>
                      <CheckoutPage modeOverride="FRESH_MANDI" />
                    </ProtectedRoute>
                  }
                />
                <Route path="/order-tracking" element={<OrderTracking />} />
                <Route path="/order-tracking/:id" element={<OrderTracking />} />
                <Route
                  path="/orders"
                  element={
                    <ProtectedRoute allowedRoles={['customer', 'consumer']}>
                      <OrderHistory />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute allowedRoles={['customer', 'consumer', 'vendor', 'delivery_partner', 'admin']}>
                      <Profile />
                    </ProtectedRoute>
                  }
                />

                {/* Vendor Routes */}
                <Route path="/vendor/onboarding" element={<ProtectedRoute allowedRoles={['customer', 'consumer', 'vendor', 'admin']}><VendorOnboarding /></ProtectedRoute>} />
                <Route
                  path="/vendor/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['vendor', 'admin']}>
                      <VendorDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Delivery Routes */}
                <Route path="/delivery/onboarding" element={<ProtectedRoute allowedRoles={['customer', 'consumer', 'delivery_partner', 'admin']}><DeliveryOnboarding /></ProtectedRoute>} />
                <Route
                  path="/delivery/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['delivery_partner', 'admin']}>
                      <DeliveryDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Routes */}
                <Route
                  path="/admin/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </Router>
        </CartProvider>
      </ModeProvider>
    </AuthProvider>
  );
}
