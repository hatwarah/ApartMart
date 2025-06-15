import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useCartStore } from './store/cartStore';

// Layout
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Home from './pages/Home';
import SignIn from './pages/auth/SignIn';
import SignUp from './pages/auth/SignUp';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import ProductManagement from './pages/admin/ProductManagement';

// Team Pages
import TeamDashboard from './pages/team/TeamDashboard';
import ProductForm from './pages/team/ProductForm';

function App() {
  const { initialize, user } = useAuthStore();
  const { fetchCart } = useCartStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (user) {
      fetchCart();
    }
  }, [user, fetchCart]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Public Routes */}
          <Route index element={<Home />} />
          <Route path="/products" element={<Home />} />
          <Route path="/auth/signin" element={<SignIn />} />
          <Route path="/auth/signup" element={<SignUp />} />
          
          {/* Protected Routes */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <div className="min-h-screen flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900">Profile Page</h1>
                    <p className="text-gray-600 mt-4">Coming soon...</p>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/cart"
            element={
              <ProtectedRoute>
                <Cart />
              </ProtectedRoute>
            }
          />

          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/wishlist"
            element={
              <ProtectedRoute>
                <div className="min-h-screen flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900">Wishlist</h1>
                    <p className="text-gray-600 mt-4">Coming soon...</p>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <div className="min-h-screen flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
                    <p className="text-gray-600 mt-4">Coming soon...</p>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
          
          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requiredRole="admin">
                <UserManagement />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin/products"
            element={
              <ProtectedRoute requiredRole="admin">
                <ProductManagement />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin/orders"
            element={
              <ProtectedRoute requiredRole="admin">
                <div className="min-h-screen flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
                    <p className="text-gray-600 mt-4">Coming soon...</p>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute requiredRole="admin">
                <div className="min-h-screen flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
                    <p className="text-gray-600 mt-4">Coming soon...</p>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
          
          {/* Team Routes */}
          <Route
            path="/team"
            element={
              <ProtectedRoute requiredRole="team">
                <TeamDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/team/products"
            element={
              <ProtectedRoute requiredRole="team">
                <ProductManagement />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/team/products/new"
            element={
              <ProtectedRoute requiredRole="team">
                <ProductForm />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/team/products/:id/edit"
            element={
              <ProtectedRoute requiredRole="team">
                <ProductForm />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/team/orders"
            element={
              <ProtectedRoute requiredRole="team">
                <div className="min-h-screen flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900">Order Processing</h1>
                    <p className="text-gray-600 mt-4">Coming soon...</p>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;