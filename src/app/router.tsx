import { createBrowserRouter } from 'react-router-dom'

import RoleProtectedRoute from '../components/auth/RoleProtectedRoute'
import ProtectedRoute from '../components/auth/ProtectedRoute'

import AboutPage from '../pages/AboutPage'
import ContactPage from '../pages/ContactPage'
import DashboardEntryPage from '../pages/DashboardEntryPage'
import HomePage from '../pages/HomePage'
import HowItWorksPage from '../pages/HowItWorksPage'
import LoginPage from '../pages/LoginPage'
import NotFoundPage from '../pages/NotFoundPage'
import RegisterPage from '../pages/RegisterPage'
import ServicesPage from '../pages/ServicesPage'
import UnauthorizedPage from '../pages/UnauthorizedPage'

const router = createBrowserRouter([
  // Public routes
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/about',
    element: <AboutPage />,
  },
  {
    path: '/services',
    element: <ServicesPage />,
  },
  {
    path: '/how-it-works',
    element: <HowItWorksPage />,
  },
  {
    path: '/contact',
    element: <ContactPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },

  // Authenticated user route
  {
    path: '/dashboard',
    element: (
      <RoleProtectedRoute allowedRole="user">
        <DashboardEntryPage />
      </RoleProtectedRoute>
    ),
  },

  // Technician-only route
  {
    path: '/technician/dashboard',
    element: (
      <RoleProtectedRoute allowedRole="technician">
        <DashboardEntryPage />
      </RoleProtectedRoute>
    ),
  },

  // Admin-only route
  {
    path: '/admin/dashboard',
    element: (
      <RoleProtectedRoute allowedRole="admin">
        <DashboardEntryPage />
      </RoleProtectedRoute>
    ),
  },

  // General authenticated route example
  {
    path: '/account',
    element: (
      <ProtectedRoute>
        <DashboardEntryPage />
      </ProtectedRoute>
    ),
  },

  // Access denied
  {
    path: '/unauthorized',
    element: <UnauthorizedPage />,
  },

  // Fallback
  {
    path: '*',
    element: <NotFoundPage />,
  },
])

export default router
