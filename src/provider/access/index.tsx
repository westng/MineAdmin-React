import type { ReactNode } from 'react'
import { useAccess } from '@/hooks/framework/use-access'
import { MaAccess } from '@/components/ma-access'
import type { AccessPolicy } from '@/services/auth/access'
export function Access({
  policy,
  children,
  fallback,
}: {
  policy: AccessPolicy
  children: ReactNode
  fallback?: ReactNode
}) {
  const can = useAccess()
  return (
    <MaAccess allowed={can(policy)} fallback={fallback}>
      {children}
    </MaAccess>
  )
}
