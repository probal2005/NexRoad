import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import type { UserRole } from '../../auth/AuthContext'
import { useAuth } from '../../auth/useAuth'
import ProtectedRoute from './ProtectedRoute'

interface RoleCheckProps {
  allowedRole: UserRole
  children: ReactNode
}

function RoleCheck({ allowedRole, children }: RoleCheckProps) {
  const { role } = useAuth()

  if (role !== allowedRole) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}

interface RoleProtectedRouteProps {
  allowedRole: UserRole
  children: ReactNode
}

export default function RoleProtectedRoute({
  allowedRole,
  children,
}: RoleProtectedRouteProps) {
  return (
    <ProtectedRoute>
      <RoleCheck allowedRole={allowedRole}>
        {children}
      </RoleCheck>
    </ProtectedRoute>
  )
}