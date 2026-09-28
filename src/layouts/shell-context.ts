import { createContext } from 'react'
import type { MenuVo } from '@/services/navigation/types'
export interface ShellContextValue {
  menus: MenuVo[]
  activeSection: MenuVo | undefined
  setSection: (path: string) => void
  pathname: string
  notificationsOpen: boolean
  setNotificationsOpen: (open: boolean) => void
}
export const ShellContext = createContext<ShellContextValue | null>(null)
