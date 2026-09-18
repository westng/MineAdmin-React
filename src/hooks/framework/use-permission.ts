import { evaluateAccess } from '@/services/auth/access'
import { useMemo } from 'react'
import { useSessionStore } from '@/provider/session'
import { useSession } from './use-session'

function matches(values: string[], expected: string | string[]) {
  return evaluateAccess({ permission: expected }, { permissions: values, roles: [], userInfo: null })
}

/** Application-bound compatibility helper for code outside React. Components should use usePermission. */
export function hasAuth(permission: string | string[]) {
  return matches(useSessionStore.getState().permissions, permission)
}

export function hasRole(role: string | string[]) {
  return matches(useSessionStore.getState().roles, role)
}

export function usePermission() {
  const permissions = useSession(state => state.permissions)
  const roles = useSession(state => state.roles)
  return useMemo(
    () => ({
      hasAuth: (permission: string | string[]) => matches(permissions, permission),
      hasRole: (role: string | string[]) => matches(roles, role),
    }),
    [permissions, roles],
  )
}

export function PermissionGate({ permission, children }: { permission: string | string[]; children: React.ReactNode }) {
  const { hasAuth: canAccess } = usePermission()
  return canAccess(permission) ? children : null
}
