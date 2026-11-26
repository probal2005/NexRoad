import { createBrowserRouter } from 'react-router-dom'

import RoleProtectedRoute from '../components/auth/RoleProtectedRoute'
import ProtectedRoute from '../components/auth/ProtectedRoute'

import DashboardEntryPage from '../pages/DashboardEntryPage'
import HomePage from '../pages/HomePage'
import NotFoundPage from '../pages/NotFoundPage'
import UnauthorizedPage from '../pages/UnauthorizedPage'

import RouteErrorPage from '../pages/RouteErrorPage'
import DocumentLayout from './DocumentLayout'

import {
  AboutPage,
  AdminDashboardPage,
  ContactPage,
  CustomerDashboardPage,
  DemoPreviewPage,
  HowItWorksPage,
  LoginPage,
  RegisterPage,
  ServicesPage,
  TechnicianDashboardPage,
} from './lazyPages'

const routes = [
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
        <AdminDashboardPage />
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
]

const router = createBrowserRouter([
  { element: <DocumentLayout />, errorElement: <RouteErrorPage />, children: routes },
])

export default router
