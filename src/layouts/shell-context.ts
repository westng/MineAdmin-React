import { createContext } from 'react'
import type { MenuVo } from '@/modules/base/permission/menu/api/permission'
export interface ShellContextValue {
  menus: MenuVo[]
  activeSection: MenuVo | undefined
  setSection: (path: string) => void
  pathname: string
  notificationsOpen: boolean
  setNotificationsOpen: (open: boolean) => void
}
export const ShellContext = createContext<ShellContextValue | null>(null)
