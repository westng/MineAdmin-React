import type { ReactNode } from 'react'
import { usePermission } from '@/hooks/auth/use-permission'

export function PermissionGate({ permission, children }: { permission: string | string[]; children: ReactNode }) {
  const { hasAuth: canAccess } = usePermission()
  return canAccess(permission) ? children : null
}
