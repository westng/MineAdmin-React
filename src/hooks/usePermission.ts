import { useMemo } from 'react'
import { useUserStore } from '@/store/modules/useUserStore'

function matches(values: string[], expected: string | string[]) {
  if (values.includes('*')) return true
  const candidates = Array.isArray(expected) ? expected : [expected]
  return candidates.some(value => values.includes(value))
}

export function hasAuth(permission: string | string[]) {
  return matches(useUserStore.getState().permissions, permission)
}

export function hasRole(role: string | string[]) {
  return matches(useUserStore.getState().roles, role)
}

export function usePermission() {
  const permissions = useUserStore(state => state.permissions)
  const roles = useUserStore(state => state.roles)
  return useMemo(() => ({
    hasAuth: (permission: string | string[]) => matches(permissions, permission),
    hasRole: (role: string | string[]) => matches(roles, role),
  }), [permissions, roles])
}

export function PermissionGate({ permission, children }: { permission: string | string[]; children: React.ReactNode }) {
  const { hasAuth: canAccess } = usePermission()
  return canAccess(permission) ? children : null
}
