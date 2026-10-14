import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ModeProvider } from './context/ModeContext';

// Customer App Pages
import { Home } from './modules/customer';
const RestaurantDetail = lazy(() => import('./modules/customer').then(m => ({ default: m.RestaurantDetail })));
const CartPage = lazy(() => import('./modules/customer').then(m => ({ default: m.CartPage })));
const CheckoutPage = lazy(() => import('./modules/customer').then(m => ({ default: m.CheckoutPage })));
const OrderTracking = lazy(() => import('./modules/customer').then(m => ({ default: m.OrderTracking })));
const OrderHistory = lazy(() => import('./modules/customer').then(m => ({ default: m.OrderHistory })));
const SearchPage = lazy(() => import('./modules/customer').then(m => ({ default: m.SearchPage })));
const Profile = lazy(() => import('./modules/customer').then(m => ({ default: m.Profile })));

// Customer Auth Pages
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));

const PageFallback = () => (
  <div className="fc-page flex items-center justify-center min-h-[60vh]">
    <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-[var(--fc-green)] animate-spin" aria-label="Loading" />
  </div>
);

// Protected Route Wrapper for Authenticated Customer Pages
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
      <ModeProvider>
        <CartProvider>
          <Router>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                {/* Public / Auth */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />

                {/* Customer App Core Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/home" element={<Home />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/restaurant/:id" element={<RestaurantDetail />} />
                <Route path="/cart" element={<CartPage />} />
                
                {/* Checkout Routes */}
                <Route
                  path="/checkout"
                  element={
                    <ProtectedRoute>
                      <CheckoutPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/checkout/cravings"
                  element={
                    <ProtectedRoute>
                      <CheckoutPage modeOverride="CRAVINGS" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/checkout/craving"
                  element={
                    <ProtectedRoute>
                      <CheckoutPage modeOverride="CRAVINGS" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/checkout/fresh-mandi"
                  element={
                    <ProtectedRoute>
                      <CheckoutPage modeOverride="FRESH_MANDI" />
                    </ProtectedRoute>
                  }
                />

                {/* Order Tracking & History */}
                <Route path="/order-tracking" element={<OrderTracking />} />
                <Route path="/order-tracking/:id" element={<OrderTracking />} />
                <Route
                  path="/orders"
                  element={
                    <ProtectedRoute>
                      <OrderHistory />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/history"
                  element={
                    <ProtectedRoute>
                      <OrderHistory />
                    </ProtectedRoute>
                  }
                />

                {/* Customer Profile & Address Book */}
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback to Home */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </Router>
        </CartProvider>
      </ModeProvider>
    </AuthProvider>
  );
}
