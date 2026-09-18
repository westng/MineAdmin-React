import type { ReactNode } from 'react'
export interface MaAccessProps {
  allowed: boolean
  children: ReactNode
  fallback?: ReactNode
}
export function MaAccess({ allowed, children, fallback = null }: MaAccessProps) {
  return allowed === true ? children : fallback
}
