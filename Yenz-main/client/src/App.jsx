import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ModeProvider } from './context/ModeContext';

// 1. Customer App Module (Mirroring /mobile/customer)
import { Home } from './modules/customer';
const RestaurantDetail = lazy(() => import('./modules/customer').then(m => ({ default: m.RestaurantDetail })));
const CartPage = lazy(() => import('./modules/customer').then(m => ({ default: m.CartPage })));
const CheckoutPage = lazy(() => import('./modules/customer').then(m => ({ default: m.CheckoutPage })));
const OrderTracking = lazy(() => import('./modules/customer').then(m => ({ default: m.OrderTracking })));
const OrderHistory = lazy(() => import('./modules/customer').then(m => ({ default: m.OrderHistory })));
const SearchPage = lazy(() => import('./modules/customer').then(m => ({ default: m.SearchPage })));
const Profile = lazy(() => import('./modules/customer').then(m => ({ default: m.Profile })));

// 2. Vendor App Module (Mirroring /mobile/vendor)
const VendorDashboard = lazy(() => import('./modules/vendor').then(m => ({ default: m.VendorDashboard })));
const VendorOnboarding = lazy(() => import('./modules/vendor').then(m => ({ default: m.VendorOnboarding })));

// 3. Rider / Delivery Partner App Module (Mirroring /mobile/rider)
const DeliveryDashboard = lazy(() => import('./modules/rider').then(m => ({ default: m.DeliveryDashboard })));
const DeliveryOnboarding = lazy(() => import('./modules/rider').then(m => ({ default: m.DeliveryOnboarding })));
const ActiveTrip = lazy(() => import('./modules/rider').then(m => ({ default: m.ActiveTrip })));

// 4. Private Admin App Module (Mirroring /mobile/admin)
const AdminDashboard = lazy(() => import('./modules/admin').then(m => ({ default: m.AdminDashboard })));
const AdminApplications = lazy(() => import('./modules/admin').then(m => ({ default: m.AdminApplications })));

// Common Auth
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));

const PageFallback = () => (
  <div className="fc-page flex items-center justify-center">
    <div className="w-9 h-9 rounded-full border-4 border-gray-200 border-t-[var(--fc-green)] animate-spin" aria-label="Loading" />
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
                  path="/checkout/craving"
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
                    <ProtectedRoute allowedRoles={['customer', 'consumer', 'vendor', 'delivery_partner', 'admin']}>
                      <OrderHistory />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/history"
                  element={
                    <ProtectedRoute allowedRoles={['customer', 'consumer', 'vendor', 'delivery_partner', 'admin']}>
                      <OrderHistory />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/vendor/orders"
                  element={
                    <ProtectedRoute allowedRoles={['vendor', 'admin']}>
                      <OrderHistory />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/vendor/history"
                  element={
                    <ProtectedRoute allowedRoles={['vendor', 'admin']}>
                      <OrderHistory />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/delivery/orders"
                  element={
                    <ProtectedRoute allowedRoles={['delivery_partner', 'admin']}>
                      <OrderHistory />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/delivery/history"
                  element={
                    <ProtectedRoute allowedRoles={['delivery_partner', 'admin']}>
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
                <Route
                  path="/delivery/active-trip"
                  element={
                    <ProtectedRoute allowedRoles={['delivery_partner', 'admin']}>
                      <ActiveTrip />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/delivery/active-trip/:deliveryId"
                  element={
                    <ProtectedRoute allowedRoles={['delivery_partner', 'admin']}>
                      <ActiveTrip />
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
                <Route
                  path="/admin/applications"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminApplications />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/onboarding"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminApplications />
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
