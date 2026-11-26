import { createBrowserRouter } from 'react-router-dom'

import RoleProtectedRoute from '../components/auth/RoleProtectedRoute'
import ProtectedRoute from '../components/auth/ProtectedRoute'

import AboutPage from '../pages/AboutPage'
import ContactPage from '../pages/ContactPage'
import CustomerDashboardPage from '../pages/CustomerDashboardPage'
import DashboardEntryPage from '../pages/DashboardEntryPage'
import DemoPreviewPage from '../pages/DemoPreviewPage'
import HomePage from '../pages/HomePage'
import HowItWorksPage from '../pages/HowItWorksPage'
import LoginPage from '../pages/LoginPage'
import NotFoundPage from '../pages/NotFoundPage'
import RegisterPage from '../pages/RegisterPage'
import ServicesPage from '../pages/ServicesPage'
import TechnicianDashboardPage from '../pages/TechnicianDashboardPage'
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

  { path: '/demo/:role', element: <DemoPreviewPage /> },

  // Authenticated user route
  {
    path: '/dashboard',
    element: (
      <RoleProtectedRoute allowedRole="user">
        <CustomerDashboardPage />
      </RoleProtectedRoute>
    ),
  },

  // Technician-only route
  {
    path: '/technician/dashboard',
    element: (
      <RoleProtectedRoute allowedRole="technician">
        <TechnicianDashboardPage />
      </RoleProtectedRoute>
    ),
  },

  {
    path: '/technician/application',
    element: (
      <ProtectedRoute>
        <TechnicianDashboardPage applicationOnly />
      </ProtectedRoute>
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
