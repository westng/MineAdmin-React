import { useCallback } from 'react'
import { evaluateAccess, type AccessPolicy } from '@/services/auth/access'
import { useSession } from './use-session'
export function useAccess() {
  const roles = useSession(state => state.roles)
  const permissions = useSession(state => state.permissions)
  const userInfo = useSession(state => state.userInfo)
  return useCallback(
    (policy: AccessPolicy) => evaluateAccess(policy, { roles, permissions, userInfo }),
    [roles, permissions, userInfo],
  )
}
