import { createContext, useContext } from 'react'
import type { MenuVo } from '@/modules/base/permission/menu/api/permission'

export const VerveNavigationContext = createContext<{
  section?: MenuVo
  clearSection: () => void
  selectSection: (menu: MenuVo) => void
  width: number
  setWidth: (width: number) => void
} | null>(null)

export function useVerveNavigation() {
  const context = useContext(VerveNavigationContext)
  if (!context) throw new Error('VerveNavigationProvider is required')
  return context
}
