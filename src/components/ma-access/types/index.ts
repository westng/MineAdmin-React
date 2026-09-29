import type { ReactNode } from 'react'

export interface MaAccessProps {
  allowed: boolean
  children: ReactNode
  fallback?: ReactNode
}
