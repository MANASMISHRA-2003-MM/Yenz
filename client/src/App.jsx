import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ModeProvider } from './context/ModeContext';

// Consumer Pages
import Home from './pages/consumer/Home';
import RestaurantDetail from './pages/consumer/RestaurantDetail';
import CartPage from './pages/consumer/CartPage';
import CheckoutPage from './pages/consumer/CheckoutPage';
import OrderTracking from './pages/consumer/OrderTracking';
import OrderHistory from './pages/consumer/OrderHistory';
import SearchPage from './pages/consumer/SearchPage';

// Vendor Pages
import VendorDashboard from './pages/vendor/VendorDashboard';

// Delivery Pages
import DeliveryDashboard from './pages/delivery/DeliveryDashboard';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Protected Route Wrapper with RBAC for Unified Krawing System
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
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
            <Routes>
              {/* Public / Auth */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Consumer Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/home" element={<Home />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/restaurant/:id" element={<RestaurantDetail />} />
              <Route path="/cart" element={<CartPage />} />
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

              {/* Vendor Routes */}
              <Route
                path="/vendor/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['vendor', 'admin']}>
                    <VendorDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Delivery Routes */}
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
          </Router>
        </CartProvider>
      </ModeProvider>
    </AuthProvider>
  );
}
