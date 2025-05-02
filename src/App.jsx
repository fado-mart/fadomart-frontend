import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'
import MainLayout from './layouts/MainLayout'
import ErrorBoundary from './components/ErrorBoundary'
import Home from './pages/Home'
import Products from './pages/Products'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Profile from './pages/Profile'
import Orders from './pages/Orders'
import AdminDashboard from './pages/admin/Dashboard'
import Overview from './pages/admin/Overview'
import AdminProducts from './pages/admin/Products'
import AdminCategories from './pages/admin/Categories'
import AdminInventory from './pages/admin/Inventory'
import Reports from './pages/admin/Reports'
import Users from './pages/admin/Users'

// Create a theme instance
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
})

function App() {
  // Admin route wrapper component
  const AdminRoute = ({ children }) => {
    const { user } = useAuth()
    
    if (!user || user.role !== 'Admin') {
      return <Navigate to="/" replace />
    }
    
    return children
  }

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <CartProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/" element={<MainLayout />}>
                  <Route index element={<Home />} />
                  <Route path="products" element={<Products />} />
                  <Route path="cart" element={<Cart />} />
                  <Route path="checkout" element={<Checkout />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="orders" element={<Orders />} />
                  {/* Admin Routes */}
                  <Route path="admin" element={
                    <AdminRoute>
                      <AdminDashboard />
                    </AdminRoute>
                  }>
                    <Route index element={<Overview />} />
                    <Route path="products" element={<AdminProducts />} />
                    <Route path="categories" element={<AdminCategories />} />
                    <Route path="inventory" element={<AdminInventory />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="users" element={<Users />} />
                  </Route>
                </Route>
              </Routes>
            </Router>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
