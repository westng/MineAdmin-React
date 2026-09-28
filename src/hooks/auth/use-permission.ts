import { evaluateAccess } from '@/services/auth/access'
import { useMemo } from 'react'
import { useRuntime } from '../runtime/use-runtime'
import { useSession } from './use-session'

function matches(values: string[], expected: string | string[]) {
  return evaluateAccess({ permission: expected }, { permissions: values, roles: [], userInfo: null })
}

export function usePermission() {
  const runtime = useRuntime()
  const permissions = useSession(state => state.permissions)
  const roles = useSession(state => state.roles)
  return useMemo(
    () => ({
      permissions,
      roles,
      hasAuth: (permission: string | string[]) => matches(runtime.session.getState().permissions, permission),
      hasRole: (role: string | string[]) => matches(runtime.session.getState().roles, role),
    }),
    [runtime, permissions, roles],
  )
}
