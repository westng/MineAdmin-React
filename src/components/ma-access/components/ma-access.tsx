import type { MaAccessProps } from '../types'

export function MaAccess({ allowed, children, fallback = null }: MaAccessProps) {
  return allowed === true ? children : fallback
}
